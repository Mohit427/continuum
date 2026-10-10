---
version: 1
slug: "app-patient-page-tsx"
primary_target: "app/patient/page.tsx"
related_targets: ["app/doctor/page.tsx","app/page.tsx"]
---

Scope: Continuum app surfaces: patient dashboard (lead), timeline, records/review, labs, sharing, emergency, doctor console, lab portal, landing. Mode: operate (landing: persuade, same world). Replaces the rejected railway world (user: "looks like a Transport site", landing "like a powerpoint").
Audience: older chronic patients and caregivers on phones in daylight at home; doctors at OPD desks under fluorescent light; ER staff scanning a QR. Light ground by default from that scene; a user-chosen dark theme (system-aware, toggle in the shell) for night use.
User asked: vibrant yet professional, minimalistic, light/dark mode, no decision round, no loss of functionality.

## Direction contract

THESIS: Care read the way a pharmacist reads medicine: Swiss pharmaceutical design (Geigy school), a white grid where every therapeutic class owns one vivid code colour, so a patient's whole regimen and its conflicts read at a glance. Refuses the teal white-card dashboard and the railway costume.

OWN-WORLD: cool white canvas, raised white panels on 1px rules, near-black ink; cobalt #1f4fff is the single action/brand colour (raise from warm-consumer canon: the action colour appears only where something can be pressed or is selected); Blind Spots own a reserved signal magenta-red; therapeutic class codes (cardio vermilion, endocrine violet, renal cyan, respiratory green, analgesic amber, anti-infective pink, lipid teal) appear as solid code swatches and bars, never as text colour. Hanken Grotesk with Noto Devanagari/Tamil, tabular numerals, tight minimal type scale (h1 1.75–2rem). Dark theme mirrors every token.

STORY: the patient sees what they take, coloured by what it is for, and the flags connecting medicines from different doctors; they review a flag, share a scoped view, carry the emergency card. The doctor sees the same map, scoped, critical facts first.

FIRST VIEWPORT: white top bar (wordmark, nav, theme toggle, notifications, account). Title row "Lakshmi Raghavan" + one-line count, primary action "Add a record". Medication map full width: one swimlane per therapeutic class, each course a code-coloured bar with exact duration, lab points beneath, magenta connectors for each Blind Spot. Then Blind Spot list and the current-medicine table with class swatches.

SIGNATURE: the medication map. Hovering or focusing a Blind Spot lights its connector and the two bars or points it joins and dims the rest; bars grow in once from their start date (scaleX, ease-out expo). Raise from labanotation: length is exact duration, so the bar is the data, not decoration.

FORM: Swiss pharmaceutical packaging identity (Geigy school); position 3 on my ordered list (1 NABL lab report, 2 OPD prescription pad, 3 Swiss pharma colour-coded identity, 4 hospital colour floor-line wayfinding, 5 blister strip, 6 MCP immunisation card, 7 weekly pill organiser); seed key 2cdc2382 re-roll 1. Challengers: split-flap declined (kept: fixed-column tabular rhythm), warm consumer canon competitive (kept: action-only colour), labanotation declined (kept: length is duration), centre-rail declined, transit diagram declined (transport), doujin catalog declined.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
