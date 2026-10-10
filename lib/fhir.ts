// FHIR R4 export: makes the record portable and ABDM-ready (ABDM exchanges FHIR R4 bundles).
import type { PatientRecord } from "./data/record";
import { LAB_BY_KEY } from "./kb/labs";

const ref = (type: string, id: string) => ({ reference: `urn:uuid:${id}`, type });

export function toFhirBundle(r: PatientRecord) {
  const p = r.profile;
  const pid = p.id;
  const entries: { fullUrl: string; resource: Record<string, unknown> }[] = [];
  const add = (id: string, resource: Record<string, unknown>) => entries.push({ fullUrl: `urn:uuid:${id}`, resource: { id, ...resource } });

  add(pid, {
    resourceType: "Patient",
    identifier: [{ system: "https://continuum.app/health-id", value: p.health_id }],
    name: [{ text: p.full_name }],
    gender: p.sex === "F" ? "female" : p.sex === "M" ? "male" : "other",
    birthDate: p.dob ?? undefined,
    telecom: p.phone ? [{ system: "phone", value: p.phone }] : undefined,
    extension: p.blood_group ? [{ url: "https://continuum.app/fhir/blood-group", valueString: p.blood_group }] : undefined,
  });
  for (const pr of r.providers)
    add(pr.id, { resourceType: "Practitioner", name: [{ text: pr.name }], qualification: pr.specialty ? [{ code: { text: pr.specialty } }] : undefined });
  for (const d of r.documents.filter((x) => x.status === "confirmed"))
    add(d.id, {
      resourceType: "DocumentReference", status: "current", subject: ref("Patient", pid), date: d.doc_date ? `${d.doc_date}T00:00:00Z` : undefined,
      type: { text: d.doc_type ?? "document" }, author: d.provider_id ? [ref("Practitioner", d.provider_id)] : undefined,
      content: [{ attachment: { contentType: d.mime, title: d.file_name ?? undefined } }],
    });
  for (const c of r.conditions)
    add(c.id, {
      resourceType: "Condition", subject: ref("Patient", pid), code: { text: c.name, ...(c.icd10 ? { coding: [{ system: "http://hl7.org/fhir/sid/icd-10", code: c.icd10 }] } : {}) },
      clinicalStatus: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/condition-clinical", code: c.status === "resolved" ? "resolved" : "active" }] },
      onsetDateTime: c.onset_date ?? undefined, recorder: c.provider_id ? ref("Practitioner", c.provider_id) : undefined,
    });
  for (const m of r.medications)
    add(m.id, {
      resourceType: "MedicationStatement", status: m.status === "stopped" ? "stopped" : "active", subject: ref("Patient", pid),
      medicationCodeableConcept: { text: m.raw_name, ...(m.atc ? { coding: [{ system: "http://www.whocc.no/atc", code: m.atc, display: m.generic }] } : {}) },
      effectivePeriod: { start: m.start_date ?? undefined, end: m.end_date ?? undefined },
      dosage: [{ text: [m.dose, m.frequency].filter(Boolean).join(" ") || undefined }],
      informationSource: m.prescriber_id ? ref("Practitioner", m.prescriber_id) : undefined,
      derivedFrom: m.source_document_id ? [ref("DocumentReference", m.source_document_id)] : undefined,
    });
  for (const a of r.allergies)
    add(a.id, {
      resourceType: "AllergyIntolerance", patient: ref("Patient", pid), code: { text: a.substance },
      criticality: a.severity === "life-threatening" || a.severity === "severe" ? "high" : "low",
      reaction: a.reaction ? [{ manifestation: [{ text: a.reaction }] }] : undefined,
    });
  for (const l of r.labs) {
    const def = l.test_key ? LAB_BY_KEY[l.test_key] : undefined;
    add(l.id, {
      resourceType: "Observation", status: "final", subject: ref("Patient", pid),
      category: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: l.category === "vital" ? "vital-signs" : "laboratory" }] }],
      code: { text: l.test_name, ...(l.loinc ? { coding: [{ system: "http://loinc.org", code: l.loinc, display: def?.name }] } : {}) },
      effectiveDateTime: l.taken_at,
      ...(l.value !== null ? { valueQuantity: { value: Number(l.value), unit: l.unit ?? undefined } } : { valueString: l.value_text ?? undefined }),
      referenceRange: l.ref_low !== null || l.ref_high !== null ? [{ low: l.ref_low !== null ? { value: Number(l.ref_low) } : undefined, high: l.ref_high !== null ? { value: Number(l.ref_high) } : undefined }] : undefined,
      interpretation: l.flag && l.flag !== "N" ? [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ObservationInterpretation", code: l.flag }] }] : undefined,
      derivedFrom: l.source_document_id ? [ref("DocumentReference", l.source_document_id)] : undefined,
    });
  }
  return {
    resourceType: "Bundle", type: "collection", timestamp: new Date().toISOString(),
    meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Bundle"] },
    entry: JSON.parse(JSON.stringify(entries)), // strips undefined
  };
}
