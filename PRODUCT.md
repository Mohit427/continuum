# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

- **Patients with long-term conditions** (diabetes, hypertension, thyroid, asthma), often older, in India, who see many doctors, labs and pharmacies over years and carry their history as paper prescriptions, PDFs and WhatsApp photos. Job: keep one trustworthy history, know what they take, share the right part with the right doctor, and stop sharing afterwards. Family caregivers act on their behalf.
- **Doctors** in short (≈5-minute) consultations or emergencies who meet a patient without their history. Job: understand the patient fast, see what other clinicians prescribed, avoid repeat tests and conflicting medicines.
- **Diagnostic labs** that push reports to a patient by Health ID.
- **Hackathon judges** evaluating the product without setup (one-click demo logins).

Patient and clinician experiences carry equal weight: a calm, plain-language patient app and a dense, scannable clinician console.

## Product Purpose

Continuum, a "Continuity of Care Passport": a patient-owned, consent-based longitudinal health record. It turns messy real-world documents (prescription photos, lab PDFs) into a verified clinical timeline with provenance, and lets the patient share a scoped, time-bound, revocable view with a clinician. Success: a new doctor sees the right history in seconds, avoidable repeat tests and medication harms are caught, and the patient controls and can audit every access.

## Positioning

The **Blind Spot Engine**: deterministic, referenced rules that read the unified timeline *across providers* and surface harms no single doctor could see: prescribing cascades (e.g. amlodipine → ankle swelling → furosemide by a different doctor), drug-induced lab changes, cross-prescriber interactions, allergy conflicts, duplicate therapy, duplicate tests with ₹ cost. Other teams store records; Continuum finds what the fragmentation hid. The AI only extracts and summarises; every alert comes from explainable rules with an evidence chain and a literature reference.

## Operating Context

- Patients use phones; doctors use desktop/laptop in clinic; emergency card is opened by ER staff scanning a QR, possibly offline.
- Documents are Indian prescriptions (brand names like Glycomet, Telma, Amlong; OD/BD/TDS), lab reports, discharge summaries.
- Consent flow: doctor requests by Health ID → patient approves / narrows / denies → time-bound grant → revoke anytime → append-only access log. Break-glass emergency access is logged and notifies the patient.
- Demo story: Lakshmi Raghavan, 62 (5 doctors, 3 labs, Chennai → Bengaluru); Arjun Mehta, 34 (asthma). Synthetic data only.

## Capabilities and Constraints

- Next.js 16 App Router, Tailwind CSS v4, Supabase (Postgres + RLS, Auth, Storage, Realtime), Claude API for extraction and summaries; deployed on Vercel.
- Roles: patient, doctor, lab. Doctors only ever see patients who granted them access, filtered by scope and specialty lens; medicines and allergies are always shared in full for safety.
- Human-in-the-loop review of every AI extraction; low-confidence fields flagged.
- FHIR R4 export. Hindi/Tamil summary translation available.
- Built in a 24-hour hackathon; must be hosted publicly and demoable without setup.

## Evidence on Hand

- Synthetic patient stories and generated documents (`lib/seed/stories.ts`, `lib/seed/pdf.ts`). No real patients, testimonials, partners or clinical validation; never fabricate them.
- Clinical rule references are real citations in `lib/kb/rules.ts`.

## Product Principles

1. **Evidence over assertion**: every fact links to its source document; every alert shows its chain and reference.
2. **The patient holds the keys**: scoped, expiring, revocable access; everything logged and visible to the patient.
3. **Surface, don't diagnose**: wording is "worth reviewing", never instructions to stop a drug.
4. **Seconds matter**: the critical facts (allergies, current meds, flags) are first, for the doctor and in emergencies.
5. **Meet records as they are**: photos, PDFs, brand names, handwriting.

## Accessibility & Inclusion

Older patients and caregivers: large readable type, plain language, high contrast, generous touch targets, works on low-end phones. WCAG 2.1 AA. Emergency card readable at a glance and printable.
