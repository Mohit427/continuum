---
name: Continuum
description: A patient-held health record read like a pharmacist reads medicine, one code colour per therapeutic class.
colors:
  canvas: "#f4f6fa"
  raised: "#ffffff"
  sunk: "#eef1f6"
  ink: "#0c1222"
  ink-2: "#465066"
  ink-3: "#5f697d"
  rule: "#dce1ea"
  rule-soft: "#ebeef4"
  rule-strong: "#b7c0d0"
  brand: "#1f4fff"
  brand-deep: "#1238d6"
  brand-soft: "#e9eeff"
  brand-line: "#c3cfff"
  on-brand: "#ffffff"
  flag: "#d0174f"
  flag-deep: "#a80f3e"
  flag-soft: "#fdebf0"
  flag-line: "#f5bccd"
  pend: "#f5a524"
  pend-soft: "#fff4de"
  pend-ink: "#6f4300"
  ok: "#0a7f46"
  ok-soft: "#e3f6ec"
  ok-line: "#a8dcc0"
  warn: "#a34b00"
  warn-soft: "#fff3e3"
  warn-line: "#f2c48d"
  c-heart: "#ff4f2e"
  c-fluid: "#00a5cf"
  c-meta: "#7b3ff2"
  c-lung: "#13a454"
  c-pain: "#f59e0b"
  c-infect: "#e8318c"
  c-other: "#7d889b"
typography:
  display:
    fontFamily: "Hanken Grotesk, Noto Sans Devanagari, Noto Sans Tamil, system-ui, sans-serif"
    fontSize: "clamp(2.1rem, 4vw, 2.75rem)"
    fontWeight: 700
    lineHeight: 1.06
    letterSpacing: "-0.035em"
  headline:
    fontFamily: "Hanken Grotesk, Noto Sans Devanagari, Noto Sans Tamil, system-ui, sans-serif"
    fontSize: "clamp(1.75rem, 3vw, 2rem)"
    fontWeight: 700
    lineHeight: 1.18
    letterSpacing: "-0.022em"
  title:
    fontFamily: "Hanken Grotesk, Noto Sans Devanagari, Noto Sans Tamil, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Hanken Grotesk, Noto Sans Devanagari, Noto Sans Tamil, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
    letterSpacing: "normal"
    fontFeature: "tnum"
  body-sm:
    fontFamily: "Hanken Grotesk, Noto Sans Devanagari, Noto Sans Tamil, system-ui, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.5
    fontFeature: "tnum"
  label:
    fontFamily: "Hanken Grotesk, Noto Sans Devanagari, Noto Sans Tamil, system-ui, sans-serif"
    fontSize: "0.8125rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
    fontFeature: "tnum"
rounded:
  swatch: "3px"
  bar: "4px"
  control: "10px"
  inset: "12px"
  panel: "16px"
  pill: "9999px"
spacing:
  gutter: "16px"
  gutter-wide: "32px"
  card: "20px"
  stack: "16px"
  section: "56px"
  container: "1360px"
components:
  button-primary:
    backgroundColor: "{colors.brand}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
    typography: "{typography.body}"
  button-primary-hover:
    backgroundColor: "{colors.brand-deep}"
    textColor: "{colors.on-brand}"
  button-secondary:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.sunk}"
  button-danger:
    backgroundColor: "{colors.flag}"
    textColor: "{colors.on-brand}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-danger-hover:
    backgroundColor: "{colors.flag-deep}"
  button-ghost:
    textColor: "{colors.brand}"
    rounded: "{rounded.control}"
    padding: "0 16px"
    height: "44px"
  button-ghost-hover:
    backgroundColor: "{colors.brand-soft}"
  chip-pend:
    backgroundColor: "{colors.pend-soft}"
    textColor: "{colors.pend-ink}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
    typography: "{typography.label}"
  chip-flag:
    backgroundColor: "{colors.flag-soft}"
    textColor: "{colors.flag}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  chip-ok:
    backgroundColor: "{colors.ok-soft}"
    textColor: "{colors.ok}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  chip-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  chip-muted:
    backgroundColor: "{colors.sunk}"
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "2px 10px"
  panel:
    backgroundColor: "{colors.raised}"
    rounded: "{rounded.panel}"
    padding: "{spacing.card}"
  field:
    backgroundColor: "{colors.raised}"
    textColor: "{colors.ink}"
    rounded: "{rounded.control}"
    padding: "10px 13px"
    height: "44px"
  nav-tab:
    textColor: "{colors.ink-2}"
    rounded: "{rounded.pill}"
    padding: "0 14px"
    height: "36px"
  nav-tab-active:
    backgroundColor: "{colors.brand-soft}"
    textColor: "{colors.brand}"
  course-bar:
    rounded: "{rounded.bar}"
    height: "14px"
  class-swatch:
    rounded: "{rounded.swatch}"
    size: "11px"
---

# Design System: Continuum

## Overview

**Creative North Star: "The Dispensary Grid"**

Continuum is drawn the way mid-century Swiss pharmaceutical houses drew their cartons: a cool white grid, one disciplined action colour, and a vivid code colour for each therapeutic class. A patient's whole regimen becomes a set of coloured bars on a shared time axis, so what they take, what it is for, and where two doctors' medicines collide all read in one pass. The world is calm and clinical without being sterile: near-black ink on cool paper, hairline rules instead of boxes-within-boxes, generous 44px targets for older hands.

Density is deliberately split. Patient surfaces breathe (16px body, 1.55 leading, plain-language labels), while the clinician console and tables tighten to 15px rows with tabular figures. Both share the same tokens; the difference is spacing and how much is shown, never a different palette. Dark mode is the same world at night: every token is redefined under `[data-theme="dark"]`, code colours brighten to hold their vibrancy on near-black, and nothing is inverted by filter.

Confirmed rejections: the teal white-card health dashboard, and any transit or railway metaphor (a previous direction read as transport, not medicine).

**Key Characteristics:**
- Cool white canvas, white raised panels on 1px rules, near-black cobalt-tinted ink.
- Cobalt is the only action colour; magenta-red is reserved for Blind Spots and emergencies.
- Seven therapeutic code colours appear only as solid swatches, bars and marks.
- One grotesque family (Hanken Grotesk) with Devanagari and Tamil companions, tabular numerals everywhere.
- Flat at rest; two soft shadows for things that float or are lit.
- Length carries data: a course bar's width is its exact duration.

## Colors

A cool, nearly colourless field that lets a small set of saturated code colours do the informational work.

### Primary
- **Cobalt Dispensing Blue** (`brand`): the single action and selection colour. Primary buttons, the active nav tab tint, links, focus rings, text selection, caret and native control accent. `brand-deep` is its hover/pressed state; `brand-soft` and `brand-line` are the selected-state wash and border.

### Secondary
- **Blind Spot Magenta-Red** (`flag`): reserved signal. Blind Spot connectors, numbered markers and lit-card borders on the medication map; the emergency card header, blood group and critical medicines; unread notification badge; danger buttons. `flag-deep` is hover, `flag-soft` / `flag-line` are tinted surfaces (allergy block, break-glass notification row).

### Tertiary: therapeutic class codes
Each class owns one code colour, mapped from drug class in `lib/kb/groups.ts`:
- **Vermilion** (`c-heart`): heart and blood pressure, including statins and antiplatelets.
- **Renal Cyan** (`c-fluid`): kidney and fluid (diuretics, potassium).
- **Endocrine Violet** (`c-meta`): diabetes and hormones, including thyroid.
- **Respiratory Green** (`c-lung`): breathing.
- **Analgesic Amber** (`c-pain`): pain, inflammation, gout, systemic steroids.
- **Anti-infective Pink** (`c-infect`): antibiotics and antifungals.
- **Unclassed Slate** (`c-other`): everything else.

### Status
- **Pending Amber** (`pend`, `pend-soft`, `pend-ink`): awaiting review or consent. Chips use the soft fill with the dark `pend-ink` text.
- **Verified Green** (`ok`, `ok-soft`, `ok-line`): confirmed, approved, seen.
- **Caution Rust** (`warn`, `warn-soft`, `warn-line`): worth reviewing, low-confidence extracted fields, invalid inputs.

### Neutral
- **Cool Paper** (`canvas`): page background.
- **Carton White** (`raised`): panels, cards, the top bar (at 90% with backdrop blur), inputs.
- **Shelf Grey** (`sunk`): hover wash for rows and quiet buttons, muted chips, inset blocks (QR panel, contact row).
- **Prescription Ink** (`ink`): primary text and the "Today" tag fill. `ink-2` is secondary copy; `ink-3` is metadata, table headers, placeholders and lab/visit dot outlines.
- **Hairline** (`rule`): panel borders and header dividers. `rule-soft` is row dividers and month gridlines; `rule-strong` is hover borders, dashed empty-state outlines and scrollbar thumbs.

### Named Rules
**The Press-Only Cobalt Rule.** Cobalt appears only where something can be pressed or is currently selected. Headings, illustrations and decorative accents never use it; the one exception is a small brand-tinted icon beside a protective statement.

**The Reserved Signal Rule.** Magenta-red means "a Blind Spot or an emergency fact". It never decorates, never marks an ordinary error (that is `warn`), and never appears as a class code.

**The Swatch Not Text Rule.** Therapeutic code colours are applied as solid fills (swatches, course bars, the logo mark, landing step rules), never as text colour. Every swatch sits next to a text label so colour is never the only carrier.

**The Mirrored Night Rule.** Every token has a hand-tuned dark value; new tokens must ship both or they do not ship.

## Typography

**Display Font:** Hanken Grotesk (with system-ui, sans-serif)
**Script companions:** Noto Sans Devanagari and Noto Sans Tamil (400/600, loaded on demand) for Hindi and Tamil summaries.

**Character:** A single humanist grotesque doing every job, tightened by negative tracking at headline sizes and steadied by tabular numerals, so doses, dates and lab values line up in columns like a package insert.

### Hierarchy
- **Display** (700, 2.1rem to 2.75rem, 1.06, -0.035em): landing hero only, capped at ~20ch.
- **Headline** (700, 1.75rem to 2rem, 1.18, -0.022em): one page title per screen (patient name, "My patients"). Balanced wrapping.
- **Title** (700, 1.125rem, -0.02em): section titles, Blind Spot card headings (1.06rem), panel headings.
- **Body** (400, 1rem, 1.55): patient-facing copy; long paragraphs capped at 60ch, pretty wrapping.
- **Body small** (400, 0.9375rem): tables, map labels, card evidence lines, secondary descriptions.
- **Label** (600, 0.8125rem): field labels (at 0.9375rem), table headers, chips, prescriber lines, timestamps. Sentence case; no uppercase tracking except Health ID inputs, which are uppercase identifiers by nature.

### Named Rules
**The Tabular Body Rule.** `font-variant-numeric: tabular-nums` is set on the body and inherited everywhere. Never switch it off for numbers that sit in columns or change live.

**The Bold-Not-Big Rule.** The scale is short (0.8125 to 2rem in-app). Hierarchy comes from weight (400/600/700) and ink step (`ink` / `ink-2` / `ink-3`) before size.

## Layout

A centred container capped at 1360px with a 16px gutter on phones and 32px from the small breakpoint up (one narrower 1100px reading container, and an 860px cap for the emergency card). Pages are a vertical stack of full-width bands: title row, the medication map at full container width, then grids of cards (1 column, 2 at md, 3 at xl for Blind Spots). Section rhythm is 56px between landing bands, 32px between in-app sections, 16px between cards, 20px inside cards.

The top bar is 64px and sticky; below the large breakpoint the nav drops to its own 48px horizontally scrolling row under the bar. The medication map keeps a sticky label column (150 to 230px, clamped to 20vw) and a time column with a 760px minimum width; on narrow screens it scrolls horizontally and opens scrolled to today. Map geometry is fixed: 32px class-group headers, 42px medicine rows, 34px lab and visit tracks, 30px month axis.

Touch targets are at least 44px for primary controls and fields (36px for small buttons and nav tabs, 40px for icon buttons).

## Elevation & Depth

Flat by default. Depth comes from the three-step surface ladder (`canvas` below, `raised` panels, `sunk` insets) separated by 1px hairlines. Shadows exist only for things that float above the page or are being pointed at.

### Shadow Vocabulary
- **Pop** (`--shadow-pop`: `0 1px 2px rgb(12 18 34 / 0.06), 0 12px 32px -12px rgb(12 18 34 / 0.22)`): floating layers, namely the notification popover and the emergency card on screen.
- **Lift** (`--shadow-lift`: `0 1px 2px rgb(12 18 34 / 0.05), 0 6px 18px -10px rgb(12 18 34 / 0.18)`): a Blind Spot card while it is lit by hover or focus.
- **Press hint** (`0 1px 2px rgb(12 18 34 / 0.12)`): the primary button only.

Both named shadows deepen to black-based values in dark mode.

### Named Rules
**The Lit-Not-Lifted Rule.** Panels sit flat on their hairline at rest. Elevation is a response to state (floating, hovered, focused), not a default card style.

## Shapes

Softly rounded rectangles throughout, with radius scaled to the object: 3px for class swatches, 4px for course bars (an ongoing course has a fully rounded right end, as if still running), 10px for buttons and fields, 12px for inset blocks and the toast, 16px for panels, cards and the map figure, full pills for chips, nav tabs, icon buttons and Blind Spot number markers. Lab draws are hollow circles; visits and symptoms are hollow diamonds; both 10px with a 1.5px `ink-3` stroke.

Line form carries state alongside colour: a pending item gets a dashed outline, an ended or dismissed item is struck through (1.5px), an acknowledged Blind Spot connector is dashed. Empty states use a dashed `rule-strong` outline at panel radius.

## Components

### Buttons
Firm and quiet: solid fills, no gradients, a 1px press-down on active.
- **Shape:** gently rounded (10px), semibold, 44px tall by default (36px small, 48px large).
- **Primary:** cobalt fill, white text, 16px horizontal padding, a hairline press shadow; hover deepens to `brand-deep`.
- **Secondary:** white fill, ink text, 1px `rule` border; hover strengthens the border and washes to `sunk`.
- **Danger:** magenta-red fill, deepening on hover. Used for break-glass and revocation.
- **Ghost / Inverse:** cobalt text with a `brand-soft` hover wash; inverse is the same on a white fill.
- **Focus:** global 2.5px cobalt outline, 2px offset. Disabled drops to 50% opacity.

### Chips
- **Style:** full pill, 13px semibold, soft tinted fill with the matching deep text, no visible border.
- **Tones:** pend, brand, flag, ok, warn, muted. A `pending` chip switches to a dashed current-colour outline; an `ended` chip is struck through.

### Cards / Containers
- **Corner Style:** 16px.
- **Background:** `raised` on a `canvas` page.
- **Shadow Strategy:** none at rest (see Elevation).
- **Border:** 1px `rule`; a lit Blind Spot card switches its border to `flag`.
- **Internal Padding:** 20px (24px on the landing protection panel).

### Inputs / Fields
- **Style:** 1px `rule` border, 10px radius, white fill, 44px minimum height, 16px text so phones do not zoom.
- **Hover / Focus:** border strengthens on hover; focus sets a cobalt border plus a 3px cobalt ring at 28% mix.
- **Error / Low confidence:** `warn` border on a `warn-soft` fill, used both for invalid input and for AI-extracted fields that need human checking.
- **Labels:** semibold 15px above the field, with an optional 13px `ink-2` hint below.

### Data tables
Quiet 13px semibold `ink-3` headers over a `rule` line, 15px rows divided by `rule-soft`, hover washes the row with `sunk`. Class swatches lead medicine rows.

### Navigation
- **Top bar:** white at 90% with backdrop blur, 1px bottom rule, wordmark left, nav, then theme toggle, notifications bell, account block (name over Health ID or registration number, separated by a rule) and sign-out on the right.
- **Tabs:** pill tabs 36px tall, 15px. Inactive is `ink-2` with a `sunk` hover; active is a `brand-soft` wash with cobalt semibold text and `aria-current="page"`.
- **Icon buttons:** 40px circles, `ink-2` lucide icons at 1.75 stroke, `sunk` hover.
- **Mobile:** nav moves to a second horizontally scrolling row under the bar.

### Logo mark
Three staggered rounded bars in vermilion, violet and cyan: three courses in their class codes, offset in time, read as one regimen. Paired with a 20px bold wordmark at -0.03em. It reads in both themes because it is drawn from the code-colour tokens.

### Medication Map (signature)
A figure inside a panel. The caption row carries the title and a live legend: one swatch plus label for each class present, plus a magenta line for Blind Spots. Below, a sticky label column groups medicines under bold class headers (swatch, name, dose in `ink-3`, prescribers as links), and a time column draws month gridlines (`rule-soft`, years in `rule` with semibold labels), a dark "Today" tag and line, dashed city-move markers, and one 14px course bar per medicine whose left edge is its start date and whose width is its exact duration. Lab draws and visits sit on their own tracks beneath.

Blind Spots are magenta cubic connectors joining the evidence points, with hollow junction dots, a solid end dot, and a numbered pill marker. Hovering or focusing a connector marker or its card lights that connector (3px), rings the joined bars in `flag`, and dims everything else to roughly 25%. On load, bars grow in from their start date (`scaleX`, 0.9s expo-out, staggered 40ms) and connectors draw once (1s, 0.45s delay); all of it is disabled under reduced motion.

### Blind Spot card
A panel card with a numbered magenta marker matching the map, a severity chip (flag "Review soon", warn "Worth reviewing", muted "For your information"), a bold title, type line with a "across N doctors" note in magenta, an evidence list where each line leads with its class swatch or lab/visit/allergy glyph and links to its source document, an expandable "Why this matters" with the literature reference, and quiet secondary actions (Mark as seen, Not relevant). Cards rise in once (6px, 0.5s, staggered 50ms).

### Emergency card
An 860px card with `shadow-pop`: a magenta header band with the mark on a white tile, a giant magenta blood group, a `flag-soft` allergy block with 20px bold substances, critical medicines in bold magenta, a `sunk` tappable emergency-contact row, and a `sunk` side panel holding the QR on a white tile in ink. Prints flat.

## Do's and Don'ts

### Do:
- **Do** colour every medicine by its therapeutic group through `lib/kb/groups.ts` and the `c-*` tokens, always as a swatch or bar beside a text label.
- **Do** keep cobalt to pressable or selected elements: primary buttons, active tabs, links, focus rings.
- **Do** keep magenta-red for Blind Spots, emergency facts, unread badges and destructive actions.
- **Do** make bar length equal exact duration; an ongoing course ends at today with a rounded right end.
- **Do** carry state in line form as well as hue: dashed for pending or acknowledged, struck through for ended or dismissed.
- **Do** define a dark value for every new token under `[data-theme="dark"]`.
- **Do** keep primary controls and fields at 44px minimum and body text at 16px.
- **Do** wrap every entrance animation in the reduced-motion guard.

### Don't:
- **Don't** set text in a therapeutic code colour.
- **Don't** use cobalt or magenta-red decoratively (headings, illustrations, backgrounds of non-interactive blocks).
- **Don't** build the teal white-card health dashboard, or any transit, railway or route-map metaphor.
- **Don't** add shadows to panels at rest; use the hairline and surface ladder.
- **Don't** introduce a second typeface; scripts other than Latin use the Noto companions.
- **Don't** use uppercase tracked labels or eyebrow lines above headings.
- **Don't** let colour be the only signal on the map; every class has a label and every flag has a number.
