import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { addDays } from "../engine/util";
import type { SeedDoc, SeedPatient } from "./stories";

const INK = rgb(0.1, 0.12, 0.2);
const BLUE = rgb(0.05, 0.27, 0.55);
const GREY = rgb(0.4, 0.42, 0.48);
const RED = rgb(0.7, 0.1, 0.1);

const fmt = (iso: string) => { const [y, m, d] = iso.split("-"); return `${d}/${m}/${y}`; };

/** Render a synthetic (clearly fictional) prescription or lab report as a PDF. */
export async function renderSeedPdf(p: SeedPatient, d: SeedDoc, today: string): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${d.type} ${d.key}`);
  pdf.setProducer("Continuum synthetic demo data");
  const page = pdf.addPage([595, 842]);
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const ital = await pdf.embedFont(StandardFonts.HelveticaOblique);
  const prov = p.providers.find((x) => x.key === d.provider)!;
  const date = fmt(addDays(today, -d.daysAgo));
  const age = p.ageYears;
  let y = 800;
  const text = (s: string, x: number, yy: number, size = 10, f: PDFFont = font, color = INK) => page.drawText(s, { x, y: yy, size, font: f, color });
  const line = (yy: number, c = BLUE, t = 1) => page.drawLine({ start: { x: 40, y: yy }, end: { x: 555, y: yy }, thickness: t, color: c });

  if (d.type === "lab_report") {
    text(prov.facility.toUpperCase(), 40, y, 18, bold, BLUE);
    text(`${prov.city} · NABL accredited laboratory · Ph: 1800-000-${String(prov.key.length).padStart(4, "0")}`, 40, y - 16, 8.5, font, GREY);
    line(y - 26, BLUE, 2);
    y -= 50;
    text("LABORATORY REPORT", 40, y, 13, bold);
    y -= 22;
    const meta: [string, string][] = [["Patient", d.nameOnDoc ?? p.name], ["Age / Sex", `${age} Y / ${p.sex === "F" ? "Female" : "Male"}`], ["Sample date", date], ["Report date", date], ["Referred by", "Self"], ["Lab No.", `${prov.key.toUpperCase().slice(0, 3)}-${d.key.toUpperCase()}`]];
    meta.forEach(([k, v], i) => {
      const col = i % 2, row = Math.floor(i / 2);
      text(`${k}:`, 40 + col * 270, y - row * 15, 9.5, bold);
      text(v, 120 + col * 270, y - row * 15, 9.5);
    });
    y -= 60;
    line(y + 8, GREY, 0.5);
    ["TEST", "RESULT", "UNIT", "REFERENCE RANGE"].forEach((h, i) => text(h, [40, 260, 340, 430][i], y - 6, 9, bold, GREY));
    line(y - 12, GREY, 0.5);
    y -= 30;
    for (const l of d.labs ?? []) {
      const high = l.ref && isOut(l.value, l.ref);
      text(l.test, 40, y, 10.5);
      text(String(l.value) + (high ? "  *" : ""), 260, y, 10.5, high ? bold : font, high ? RED : INK);
      text(l.unit, 340, y, 10);
      text(l.ref ?? "-", 430, y, 10);
      y -= 22;
    }
    y -= 10;
    text("* Value outside the biological reference interval.", 40, y, 8.5, ital, GREY);
    footer(page, font, ital, "Electronically verified report. Dr. S. Pathak, MD (Pathology)");
  } else {
    text(prov.name, 40, y, 18, bold, BLUE);
    text(`${prov.specialty === "General Physician" ? "MBBS, MD (General Medicine)" : `MBBS, MD, DM · ${prov.specialty}`}`, 40, y - 16, 9, font, GREY);
    text(`${prov.facility}, ${prov.city}`, 330, y, 10, bold, INK);
    text(`Reg. No. ${prov.key.toUpperCase()}-${String(prov.name.length * 1373).slice(0, 5)}`, 330, y - 14, 9, font, GREY);
    line(y - 28, BLUE, 2);
    y -= 50;
    text(`Name: ${d.nameOnDoc ?? p.name}`, 40, y, 10.5, bold);
    text(`Age/Sex: ${age} / ${p.sex}`, 300, y, 10.5);
    text(`Date: ${date}`, 450, y, 10.5);
    y -= 26;
    if (d.vitals) {
      const v = [d.vitals.bp && `BP ${d.vitals.bp} mmHg`, d.vitals.pulse && `Pulse ${d.vitals.pulse}/min`, d.vitals.weight && `Wt ${d.vitals.weight} kg`, d.vitals.spo2 && `SpO2 ${d.vitals.spo2}%`].filter(Boolean).join("    ");
      text(v, 40, y, 10);
      y -= 22;
    }
    if (d.complaints?.length) { text("C/o:", 40, y, 10.5, bold); text(d.complaints.join(", "), 75, y, 10.5); y -= 18; }
    if (d.diagnoses?.length) { text("Dx:", 40, y, 10.5, bold); d.diagnoses.forEach((dx, i) => text(`${i + 1}. ${dx}`, 75, y - i * 15, 10.5)); y -= 15 * d.diagnoses.length + 6; }
    if (d.allergies?.length) { text(`Allergy: ${d.allergies.map((a) => `${a.substance} (${a.reaction})`).join(", ")}`, 40, y, 10.5, bold, RED); y -= 22; }
    y -= 6;
    text("Rx", 40, y, 26, bold, BLUE);
    y -= 30;
    (d.meds ?? []).forEach((m, i) => {
      text(`${i + 1}.  Tab. ${m.brand} ${m.strength ?? ""}`.replace("Tab. Foracort", "Inh. Foracort").replace("Tab. Asthalin", "Inh. Asthalin"), 55, y, 12, bold);
      text(`${m.dose} — ${m.frequency}${m.durationDays ? ` × ${m.durationDays} days` : " — to continue"}`, 75, y - 15, 10.5, ital);
      y -= 38;
    });
    if (d.notes) { y -= 6; text("Advice:", 40, y, 10.5, bold); text(d.notes, 90, y, 10.5); y -= 20; }
    text("Signature", 470, 140, 10, ital, GREY);
    page.drawLine({ start: { x: 440, y: 155 }, end: { x: 550, y: 155 }, thickness: 0.6, color: GREY });
    footer(page, font, ital, "Next visit as advised. Bring all previous reports.");
  }
  return pdf.save();
}

function footer(page: PDFPage, font: PDFFont, ital: PDFFont, s: string) {
  page.drawLine({ start: { x: 40, y: 70 }, end: { x: 555, y: 70 }, thickness: 0.5, color: GREY });
  page.drawText(s, { x: 40, y: 55, size: 8.5, font: ital, color: GREY });
  page.drawText("SYNTHETIC DEMO DOCUMENT · Continuum hackathon · not a real patient record", { x: 40, y: 40, size: 7.5, font, color: GREY });
}

function isOut(v: number, ref: string): boolean {
  const m = ref.match(/(\d+(?:\.\d+)?)\s*-\s*(\d+(?:\.\d+)?)/);
  if (m) return v < Number(m[1]) || v > Number(m[2]);
  const lt = ref.match(/<\s*(\d+(?:\.\d+)?)/);
  if (lt) return v >= Number(lt[1]);
  return false;
}
