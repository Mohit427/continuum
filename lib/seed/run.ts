import type { SupabaseClient } from "@supabase/supabase-js";
import { addDays } from "../engine/util";
import { normalizeExtraction } from "../ingest/normalize";
import { commitDocument } from "../ingest/commit";
import { reconcileAlerts } from "../engine/reconcile";
import { encryptToken, hashToken, newToken, sha256Hex } from "../crypto";
import { renderSeedPdf } from "./pdf";
import { seedDocToExtraction } from "./build";
import { DOCTORS, LABS_ACCOUNTS, PATIENTS, type SeedPatient } from "./stories";

export const DEMO_DOMAIN = "demo.continuum.app";
export const demoEmail = (account: string) => `${account}@${DEMO_DOMAIN}`;

async function findUser(sb: SupabaseClient, email: string) {
  for (let page = 1; page < 20; page++) {
    const { data, error } = await sb.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;
    const u = data.users.find((x) => x.email === email);
    if (u) return u;
    if (data.users.length < 1000) return null;
  }
  return null;
}

async function removeStorageFolder(sb: SupabaseClient, folder: string) {
  const { data } = await sb.storage.from("documents").list(folder, { limit: 1000 });
  if (data?.length) await sb.storage.from("documents").remove(data.map((f) => `${folder}/${f.name}`));
}

/** Delete (cascade) and recreate a demo account. */
async function recreateUser(sb: SupabaseClient, account: string, role: string, password: string) {
  const email = demoEmail(account);
  const existing = await findUser(sb, email);
  if (existing) {
    await removeStorageFolder(sb, existing.id);
    const { error } = await sb.auth.admin.deleteUser(existing.id);
    if (error) throw error;
  }
  const { data, error } = await sb.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { role, demo: true } });
  if (error) throw error;
  return data.user.id;
}

const dobFromAge = (today: string, age: number) => addDays(today, -Math.round(age * 365.25 + 120));

export async function seedAll(sb: SupabaseClient, opts: { password: string; today?: string; log?: (s: string) => void }) {
  const today = opts.today ?? new Date().toISOString().slice(0, 10);
  const log = opts.log ?? (() => {});
  const ids: Record<string, string> = {};

  for (const d of DOCTORS) {
    ids[d.account] = await recreateUser(sb, d.account, "doctor", opts.password);
    await must(sb.from("profiles").insert({ id: ids[d.account], role: "doctor", full_name: d.name, email: demoEmail(d.account), specialty: d.specialty, registration_no: d.registrationNo, organization: d.organization, verified: true }));
    log(`doctor ${d.name}`);
  }
  for (const l of LABS_ACCOUNTS) {
    ids[l.account] = await recreateUser(sb, l.account, "lab", opts.password);
    await must(sb.from("profiles").insert({ id: ids[l.account], role: "lab", full_name: l.name, email: demoEmail(l.account), registration_no: l.registrationNo, organization: l.organization, verified: true }));
    log(`lab ${l.name}`);
  }
  for (const p of PATIENTS) {
    ids[p.account] = await seedPatient(sb, p, today, opts.password, ids, log);
  }

  // ── Consent history so the dashboards are not empty ──
  const lakshmi = ids.lakshmi, arjun = ids.arjun, iyer = ids["dr.iyer"], menon = ids["dr.menon"];
  const at = (daysAgo: number, h = 11) => new Date(Date.parse(addDays(today, -daysAgo) + `T${String(h).padStart(2, "0")}:30:00Z`)).toISOString();

  // Arjun → Dr. Iyer: active 7-day grant from an approved request
  const { data: req } = await sb.from("access_requests").insert({ doctor_id: iyer, patient_id: arjun, requested_scope: { categories: ["all"], lens: "general" }, purpose: "Consultation: palpitations on exertion", duration_hours: 168, status: "approved", responded_at: at(1), created_at: at(1) }).select("id").single();
  const { data: g1 } = await sb.from("grants").insert({ patient_id: arjun, kind: "doctor", grantee_id: iyer, label: "Dr. Anand Iyer", scope: { categories: ["all"], lens: "general" }, purpose: "Consultation: palpitations on exertion", expires_at: new Date(Date.now() + 6 * 86_400_000).toISOString(), created_from_request: req!.id, created_at: at(1) }).select("id").single();
  await sb.from("access_requests").update({ grant_id: g1!.id }).eq("id", req!.id);
  await sb.from("access_logs").insert({ patient_id: arjun, grant_id: g1!.id, actor_id: iyer, actor_label: "Dr. Anand Iyer (Cardiology)", action: "view", detail: "Viewed summary and medicines", at: at(1, 12) });

  // Lakshmi → Dr. Menon: an old, expired endocrinology grant (shows expiry working)
  const { data: g2 } = await sb.from("grants").insert({ patient_id: lakshmi, kind: "doctor", grantee_id: menon, label: "Dr. Rahul Menon", scope: { categories: ["all"], lens: "endocrinology" }, purpose: "Diabetes follow-up", expires_at: at(240), created_at: at(250) }).select("id").single();
  await sb.from("access_logs").insert([
    { patient_id: lakshmi, grant_id: g2!.id, actor_id: menon, actor_label: "Dr. Rahul Menon (Endocrinology)", action: "view", detail: "Viewed endocrinology lens", at: at(250, 13) },
    { patient_id: lakshmi, grant_id: g2!.id, actor_id: menon, actor_label: "Dr. Rahul Menon (Endocrinology)", action: "view_document", detail: "Opened lab report", at: at(250, 14) },
  ]);
  // A revoked share link
  const t = newToken();
  await sb.from("grants").insert({ patient_id: lakshmi, kind: "link", label: "Orthopaedic consult link", token_hash: hashToken(t), token_enc: encryptToken(t), scope: { categories: ["medications", "allergies", "conditions"], lens: null }, purpose: "Knee pain consultation", expires_at: at(110), revoked_at: at(118), created_at: at(121) });

  // Emergency cards for both patients
  for (const pid of [lakshmi, arjun]) {
    const et = newToken();
    await sb.from("grants").insert({ patient_id: pid, kind: "emergency", label: "Emergency card", token_hash: hashToken(et), token_enc: encryptToken(et), scope: { categories: ["allergies", "medications", "conditions"], lens: "emergency" }, purpose: "Emergency access (pre-authorised by patient)", expires_at: null });
  }

  await sb.from("notifications").insert([
    { user_id: lakshmi, type: "welcome", title: "Your records from 5 doctors and 3 labs are now in one timeline", body: "Review the safety flags we found across them.", link: "/patient#blind-spots" },
  ]);
  log("consent history");
  return ids;
}

async function seedPatient(sb: SupabaseClient, p: SeedPatient, today: string, password: string, ids: Record<string, string>, log: (s: string) => void) {
  const pid = await recreateUser(sb, p.account, "patient", password);
  await must(sb.from("profiles").insert({
    id: pid, role: "patient", full_name: p.name, email: demoEmail(p.account), dob: dobFromAge(today, p.ageYears), sex: p.sex,
    blood_group: p.bloodGroup, phone: p.phone, health_id: p.healthId, emergency_contact: p.emergencyContact, verified: true,
  }));

  for (const d of p.docs) {
    const prov = p.providers.find((x) => x.key === d.provider)!;
    const bytes = await renderSeedPdf(p, d, today);
    const sha = sha256Hex(bytes);
    const docDate = addDays(today, -d.daysAgo);
    const path = `${pid}/${d.key}.pdf`;
    const up = await sb.storage.from("documents").upload(path, bytes, { contentType: "application/pdf", upsert: true });
    if (up.error) throw new Error(`storage upload ${path}: ${up.error.message}`);
    const extraction = seedDocToExtraction(p, d, today);
    const n = normalizeExtraction(extraction, { fallbackDate: docDate, today });
    const isLabAccount = d.provider === "citycare";
    const { data: doc, error } = await sb.from("documents").insert({
      patient_id: pid, storage_path: path, file_name: `${d.type === "lab_report" ? "Lab report" : "Prescription"} - ${prov.facility} - ${docDate}.pdf`,
      sha256: sha, mime: "application/pdf", doc_type: d.type, status: "confirmed", extracted_json: { extraction, issues: n.issues, model: "seed" },
      overall_confidence: extraction.overall_confidence, name_on_doc: extraction.patient_name, doc_date: docDate, facility: extraction.facility,
      source: isLabAccount ? "lab" : "seed", uploaded_by: isLabAccount ? ids.citycare : pid, confirmed_at: new Date().toISOString(),
      created_at: new Date(Date.parse(docDate + "T10:00:00Z")).toISOString(),
    }).select("id").single();
    if (error) throw new Error(`document ${d.key}: ${error.message}`);
    const { providerId } = await commitDocument(sb, {
      patientId: pid, documentId: doc.id, docType: d.type, n, verifiedBy: pid,
      doctorProfileId: prov.doctorAccount ? ids[prov.doctorAccount] : null,
    });
    await sb.from("documents").update({ provider_id: providerId }).eq("id", doc.id);
  }
  const res = await reconcileAlerts(sb, pid, today);
  log(`patient ${p.name}: ${p.docs.length} documents, ${res.total} alerts`);
  return pid;
}

async function must(p: PromiseLike<{ error: { message: string } | null }>) {
  const { error } = await p;
  if (error) throw new Error(error.message);
}
