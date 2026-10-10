# Continuum

**One record across every doctor, and the harms none of them could see.**

HealthTech track, IIITDM Kancheepuram 24-hour Web Hackathon: *"Lost in Transit: fragmented medical records."*

- **Live app:** https://continuum-steel.vercel.app
- **Demo video:** https://drive.google.com/file/d/19xu9k4jcrx38-clJT-fDmU7R2ykPLmWz/view?usp=sharing
- **Try it without signing up:** the home page has one-click demo logins for a patient (Lakshmi, 62), a cardiologist (Dr. Iyer) and a lab (CityCare). All data is synthetic.

---

## The problem

A patient with diabetes, high blood pressure and a thyroid condition sees five doctors and three labs over two years, in two cities. Each doctor sees only their own prescriptions. The history lives in a plastic folder and on WhatsApp, so:

- **Recall fails.** Patients can't reliably say what they take, at what dose, or what an old report said.
- **Tests are repeated.** A new doctor reorders an HbA1c done three weeks ago at another lab.
- **Harms fall between doctors.**
  - One doctor's drug causes ankle swelling, and a second doctor treats the swelling with another drug. This is a *prescribing cascade*.
  - A painkiller from an orthopaedist meets a BP drug and a diuretic from two other doctors. This is the "triple whammy" for the kidneys.
  - No single doctor holds enough of the record to see either problem.
- **Sharing is all or nothing.** Records leave as photos that can never be taken back, and the patient can't see who looked.

## The solution

Continuum is a patient-owned, consent-based longitudinal record.

1. **Ingest anything.** A phone photo or PDF of a prescription, lab report or discharge summary is read by Claude (vision and native PDF input) into structured data:
   - brand names like Glycomet or Telma are mapped to generics, drug classes and ATC codes;
   - lab tests are mapped to LOINC with unit conversion;
   - every field gets a confidence score.

   The patient checks every field next to the original before anything enters the record. Low-confidence fields are highlighted, and so are name mismatches and duplicate uploads.
2. **One verified timeline.** Medications are merged into courses across prescribers. Labs become trends, and visits, conditions and allergies are kept together. Every fact links to its source document.
3. **The Blind Spot Engine (our USP).** Deterministic, referenced rules read the unified record *across providers*:
   - 12 prescribing cascades
   - 11 drug→lab effects
   - 32 drug–drug interactions, including the triple whammy
   - drug–condition conflicts
   - duplicate therapy
   - allergy cross-reactivity
   - repeated tests within their clinical validity window, with the ₹ cost
   - refill gaps

   Each alert shows its evidence chain, the doctors involved and a literature reference. The AI never raises an alert. It only extracts and summarises, so every flag is explainable and covered by unit tests.
4. **The medication map.** Every medicine course is a bar from start to stop, colour-coded by what it treats, with lab draws and visits beneath. Each Blind Spot is drawn as a connector between the records from different doctors that it joins.
5. **Consent that can be taken back.**
   - A doctor requests access by Health ID. The patient approves, narrows (by category, specialty lens or date) or denies.
   - Access is time-bound and revocable instantly. A revoked doctor's view disappears live.
   - The patient can also create share links and QR codes, and give a caregiver access.
   - Every view lands in an append-only access log that only the patient can read.
6. **Emergencies.**
   - A printable, offline-capable QR emergency card carries blood group, allergies, critical medicines and an emergency contact. Every scan notifies the patient.
   - If the patient allowed it, a registered doctor can get 1-hour *break-glass* access by stating the emergency. It is logged and the patient is notified.
7. **For doctors.**
   - A five-minute view leads with allergies, current medicines and open flags.
   - An AI summary cites its sources line by line and can be translated to Hindi or Tamil.
   - The "Ordering a test?" checker shows the last result from any lab and counts the ₹ saved.
   - Doctors can write notes and prescriptions back into the record, which re-runs the engine.
8. **Labs** push reports to a patient by Health ID. The patient confirms them before they count.
9. **Portable.** The whole record exports as a FHIR R4 bundle (Patient, Condition, MedicationStatement, Observation, AllergyIntolerance, DocumentReference) with LOINC and ATC codes, ready for ABDM-style exchange.

## Architecture

```
Browser (patient / doctor / lab / public token pages, light + dark theme)
   │   Next.js 16 App Router: server components, server actions, route handlers
   │   proxy.ts: session refresh + role routing (patient | doctor | lab)
   ├── Supabase Postgres  ── Row Level Security on every clinical table (can_read(patient, category))
   │                      ── Realtime: notifications, access requests, grants, alerts (polling fallback)
   ├── Supabase Storage   ── private "documents" bucket, 60-second signed URLs after an access check
   ├── Supabase Auth      ── email + password, role in app_metadata
   ├── Claude (OpenRouter or Anthropic API) ── extraction (structured output, Zod-validated) and cited summaries
   └── lib/engine (pure TypeScript, deterministic, unit-tested) + lib/kb (curated clinical knowledge)
```

- **Single gate for doctors:** `lib/access.ts → getDoctorAccess()` returns the active grant's scope or throws. RLS repeats the same check inside the database, so a UI bug cannot leak rows.
- **Tokens:** share links and emergency cards use a random 32-byte token. It is stored as a SHA-256 hash, plus an AES-GCM copy so the patient can re-show the QR. URLs never contain personal data, and token routes are rate-limited.
- **Same-origin relay:** browser traffic to Supabase goes through `/sb/*` (a Next.js rewrite). Some Indian ISPs DNS-block `*.supabase.co`, and the relay keeps the app working for patients and judges on those networks.

### Key folders

| Path | What it is |
|---|---|
| `lib/engine/` | Blind Spot Engine: cascades, drug→lab, interactions, duplicates, allergies, tests, refills, reconciliation |
| `lib/kb/` | Knowledge base: ~90 drugs (Indian brands → generic → class → ATC), rules with references, 32 lab tests (LOINC, ranges, validity, ₹), specialty lenses, therapeutic groups |
| `lib/ingest/`, `lib/ai/` | Extraction schema, normalisation (units, dates, fuzzy drug match), Claude calls |
| `lib/data/` | Record loading, scoping, derived views, medication map, emergency data |
| `app/` | Pages (patient, doctor, lab, public `/s` and `/e` token pages) and API routes |
| `supabase/migrations/0001_init.sql` | Schema, RLS policies, storage bucket, realtime publication |
| `lib/seed/` + `scripts/seed.ts` | Synthetic patients, generated prescription and lab PDFs, demo accounts |

## Run it locally

Requirements: Node 20+ (tested on Node 26), a Supabase project, and an OpenRouter or Anthropic API key.

```bash
npm install
cp .env.example .env.local     # then fill in the values (see below)
```

1. **Supabase.** Open your project's **SQL Editor** and run `supabase/migrations/0001_init.sql`. It creates the tables, RLS policies, the private `documents` bucket and the realtime publication.
2. **Environment** (`.env.local`):

   | Variable | Where to find it |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | Project Settings → Data API → Project URL (just `https://<ref>.supabase.co`) |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Project Settings → API Keys → publishable (or legacy anon) key |
   | `SUPABASE_SERVICE_ROLE_KEY` | Project Settings → API Keys → secret (or legacy service_role) key. Server only |
   | `OPENROUTER_API_KEY` | openrouter.ai → Keys. When set, all AI calls go through OpenRouter |
   | `OPENROUTER_MODEL` | defaults to `anthropic/claude-sonnet-5.5` (any vision model with structured outputs works) |
   | `ANTHROPIC_API_KEY` | alternative to OpenRouter: console.anthropic.com → API Keys |
   | `EXTRACTION_MODEL` | Anthropic model when using the Anthropic key; defaults to `claude-opus-5-5` |
   | `DEMO_PASSWORD` | password for the seeded demo accounts |
   | `NEXT_PUBLIC_APP_URL` | public URL used in QR codes and share links |

3. **Seed the demo data and start the app:**

   ```bash
   npm run seed
   npm run dev
   ```

   If your ISP blocks `supabase.co` (the connection fails with `ECONNREFUSED` to 127.0.0.1), prefix both commands with `NODE_OPTIONS="--require ./scripts/doh-preload.cjs"`. That resolves Supabase hosts over DNS-over-HTTPS, for local development only.

4. **Run the tests:** `npm test`. The engine and normaliser tests cover every rule type with positive and negative cases.

Demo logins (password = `DEMO_PASSWORD`): `lakshmi@demo.continuum.app`, `arjun@demo.continuum.app`, `dr.iyer@demo.continuum.app`, `dr.menon@demo.continuum.app`, `citycare@demo.continuum.app`. The home page's demo buttons sign in for you. `demo-docs/live-upload-dr-iyer-prescription.pdf` is the prescription we upload live in the demo, and it triggers a new Blind Spot.

## Deploy (Vercel)

1. Import the GitHub repository in Vercel (framework: Next.js).
2. Add the same environment variables. Set `NEXT_PUBLIC_APP_URL` to the Vercel URL.
3. Deploy, then open `/` and use a demo login. `/api/demo/reset` re-seeds the demo accounts.

## Safety and privacy

- The AI extracts and summarises. It never diagnoses, and alerts are worded "worth reviewing", never "stop this drug".
- The patient confirms every extracted field before it enters the record, and the original document is always attached.
- Doctors see only patients who granted them access, only within that grant's scope and expiry. Medicines and allergies are always included for safety.
- The append-only access log covers views, document opens, emergency scans, break-glass access and exports.
- All patient data in this repository and the demo is synthetic.

## Libraries and APIs used (disclosure)

- **Framework and UI:**
  - Next.js 16 (App Router), React 19, TypeScript
  - Tailwind CSS v4
  - lucide-react (icons), Recharts (lab trends), qrcode.react, sonner (toasts)
  - Hanken Grotesk and Noto Sans Devanagari/Tamil via `next/font`
- **Backend:** Supabase (Postgres, Row Level Security, Auth, Storage, Realtime) via `@supabase/ssr` and `@supabase/supabase-js`.
- **AI:** Claude via OpenRouter (OpenAI-compatible API) or the Anthropic API (`@anthropic-ai/sdk`), for document extraction (vision and PDF input, structured output) and cited summaries. Every response is validated with Zod before use.
- **Utilities:** Zod (validation), fuse.js (fuzzy drug-name matching), date-fns, clsx, tailwind-merge, class-variance-authority, server-only.
- **Dev:** Vitest, tsx, dotenv, pdf-lib (generates the synthetic demo PDFs), ESLint.
- **Design process:** the UI direction was developed with the Impeccable design skill (audit, direction, craft review).

## Clinical knowledge references

Every rule in `lib/kb/rules.ts` carries a `ref` field. Sources include:
- Savage RD et al., *JAMA Intern Med* 2020: the calcium-channel blocker → diuretic cascade.
- Gurwitz JH et al., *JAMA* 1994: NSAIDs → antihypertensive therapy.
- Lapi F et al., *BMJ* 2013: "triple whammy" acute kidney injury.
- de Jager J et al., *BMJ* 2010: metformin and vitamin B12.
- Clinical guidelines:
  - KDIGO AKI 2012 and CKD 2024;
  - NICE NG203 and NG136;
  - BNF interaction guidance.
- Product labelling for individual drugs.

Rules surface patterns for clinical review. They are not a substitute for clinical judgement.

## Team

Mohit Kumar (with Claude as a pair-programmer).
