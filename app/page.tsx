import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, Camera, FileJson, FlaskConical, KeyRound, ListChecks, QrCode, ScanSearch, ShieldCheck, Sparkles, Stethoscope, UserRound } from "lucide-react";
import { getSession } from "@/lib/auth";
import { demoLogin } from "@/app/actions/auth";
import { CASCADES, DRUG_LAB, INTERACTIONS } from "@/lib/kb/rules";
import { DRUGS } from "@/lib/kb/drugs";
import { ThemeToggle } from "@/components/shell/ThemeToggle";
import { Wordmark } from "@/components/shell/Logo";
import { DemoReset } from "@/components/DemoReset";
import { buttonClass } from "@/components/ui";

const FEATURES = [
  { icon: Camera, color: "var(--color-c-heart)", t: "Reads any document", d: "Snap a handwritten prescription or upload a lab PDF. Brand names, doses, units and dates are read for you, and you confirm every field before it counts." },
  { icon: ListChecks, color: "var(--color-c-meta)", t: "One verified history", d: "Every doctor, lab and city in one timeline. Medicines, results, allergies and conditions, each linked to the original document." },
  { icon: ScanSearch, color: "var(--color-flag)", t: "The Blind Spot Engine", d: `Referenced clinical rules catch what no single doctor can see: ${CASCADES.length} prescribing cascades, ${DRUG_LAB.length} medicine-to-lab effects, ${INTERACTIONS.length} interactions across ${DRUGS.length} drugs, repeat tests and allergy conflicts.` },
  { icon: KeyRound, color: "var(--color-c-fluid)", t: "Share, then take it back", d: "Doctors ask by Health ID. You approve, narrow to a specialty, or deny. Access expires on its own, and every view lands in a log only you can read." },
  { icon: QrCode, color: "var(--color-c-pain)", t: "Emergency card", d: "Blood group, allergies and critical medicines on a QR card that works offline. Every scan notifies you." },
  { icon: Stethoscope, color: "var(--color-c-lung)", t: "The five-minute view", d: "Doctors open a cited summary, current medicines and open flags first, check whether a test was done recently, and write notes back." },
  { icon: Sparkles, color: "var(--color-c-infect)", t: "Ask your record", d: "A built-in assistant answers questions about your own record, in plain words, and nothing else." },
  { icon: FileJson, color: "var(--color-c-other)", t: "Yours to take anywhere", d: "Export everything as a standard FHIR R4 bundle with LOINC and ATC codes, ready for ABDM-style exchange." },
];

function DemoButton({ account, icon, title }: { account: string; icon: React.ReactNode; title: string }) {
  return (
    <form action={demoLogin.bind(null, account)}>
      <button className="inline-flex items-center gap-2 h-10 px-3.5 rounded-full border border-rule bg-raised text-sm font-semibold hover:border-rule-strong hover:bg-sunk transition-colors">
        <span className="text-brand">{icon}</span>{title}
      </button>
    </form>
  );
}

/** Abstract regimen motif: coloured course bars joined by one signal connector. Decorative only, no data. */
function Motif() {
  const bars = [
    { y: 34, x: 40, w: 300, c: "var(--color-c-heart)" },
    { y: 84, x: 120, w: 250, c: "var(--color-c-heart)" },
    { y: 150, x: 210, w: 190, c: "var(--color-c-fluid)" },
    { y: 216, x: 20, w: 380, c: "var(--color-c-meta)" },
    { y: 266, x: 230, w: 120, c: "var(--color-c-meta)" },
    { y: 332, x: 290, w: 110, c: "var(--color-c-pain)" },
  ];
  return (
    <svg viewBox="0 0 420 370" className="w-full h-auto" aria-hidden>
      {[60, 160, 260, 360].map((x) => <line key={x} x1={x} y1={10} x2={x} y2={360} stroke="var(--color-rule-soft)" strokeWidth={1} />)}
      {bars.map((b, i) => <rect key={i} className="bar-grow" style={{ animationDelay: `${i * 70}ms` }} x={b.x} y={b.y - 9} width={b.w} height={18} rx={9} fill={b.c} />)}
      <path d="M120 84 C 165 84, 165 150, 210 150" fill="none" stroke="var(--color-flag)" strokeWidth={3} className="link-draw" style={{ ["--len" as string]: 160 }} />
      <path d="M210 150 C 250 150, 250 332, 290 332" fill="none" stroke="var(--color-flag)" strokeWidth={2} strokeOpacity={0.4} className="link-draw" style={{ ["--len" as string]: 260 }} />
      <circle cx={120} cy={84} r={7} fill="var(--color-raised)" stroke="var(--color-flag)" strokeWidth={3} />
      <circle cx={210} cy={150} r={7} fill="var(--color-flag)" />
      <circle cx={290} cy={332} r={6} fill="var(--color-raised)" stroke="var(--color-flag)" strokeWidth={2.5} strokeOpacity={0.6} />
    </svg>
  );
}

export default async function Landing() {
  const s = await getSession().catch(() => null);
  if (s) redirect(`/${s.profile.role}`);

  return (
    <div className="flex-1">
      <header className="border-b border-rule bg-raised/90 backdrop-blur-md sticky top-0 z-40">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8 h-16 flex items-center justify-between">
          <Wordmark />
          <nav className="flex items-center gap-0.5 sm:gap-1 text-sm">
            <ThemeToggle />
            <Link href="/login" className="px-3 h-9 inline-flex items-center whitespace-nowrap rounded-full text-ink-2 hover:bg-sunk hover:text-ink font-semibold">Sign in</Link>
            <Link href="/signup" className="px-3.5 h-9 inline-flex items-center whitespace-nowrap rounded-full bg-brand text-on-brand font-semibold hover:bg-brand-deep"><span className="sm:hidden">Sign up</span><span className="hidden sm:inline">Create account</span></Link>
          </nav>
        </div>
      </header>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-8 pt-14 sm:pt-20 pb-16 grid gap-12 lg:grid-cols-[1.1fr_0.9fr] items-center">
        <div>
          <h1 className="text-[2.6rem] sm:text-[3.6rem] leading-[1.02] tracking-[-0.045em]">
            Many doctors.<br />One story.<br /><span className="text-flag">No blind spots.</span>
          </h1>
          <p className="mt-6 text-[1.12rem] text-ink-2 max-w-[46ch]">Your prescriptions and lab reports, turned into one health record you own, and checked for the risks that fall between your doctors.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="/signup" className={buttonClass("primary", "lg")}>Create your record <ArrowRight size={18} /></Link>
            <Link href="/signup?role=doctor" className={buttonClass("secondary", "lg")}>I&rsquo;m a doctor</Link>
          </div>
          <div className="mt-8 flex flex-wrap items-center gap-2">
            <span className="text-sm text-ink-3 mr-1">Try a demo account:</span>
            <DemoButton account="lakshmi" icon={<UserRound size={16} />} title="Patient" />
            <DemoButton account="dr.iyer" icon={<Stethoscope size={16} />} title="Doctor" />
            <DemoButton account="citycare" icon={<FlaskConical size={16} />} title="Lab" />
          </div>
        </div>
        <div className="hidden sm:block rounded-3xl border border-rule bg-raised p-6 sm:p-8 shadow-lift">
          <Motif />
        </div>
      </section>

      <section className="border-y border-rule bg-raised">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8 py-16 sm:py-20 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
          <h2 className="text-[1.9rem] sm:text-[2.4rem] leading-[1.08] tracking-[-0.035em] font-bold">Our mission</h2>
          <div className="space-y-5 text-[1.08rem] text-ink-2 max-w-[62ch]">
            <p className="text-ink text-[1.25rem] leading-snug font-semibold tracking-[-0.015em]">No one should be harmed because their history got lost between clinics.</p>
            <p>A patient with diabetes or heart disease sees many doctors over the years, often in different cities, and carries their history as paper and phone photos. Each doctor sees one piece. Tests get repeated, medicines collide, and a side effect from one prescription gets treated as a new illness by the next.</p>
            <p>Continuum puts the whole story in the patient&rsquo;s hands, makes it easy to share with the right doctor for the right time, and reads across every record so the things nobody could connect get seen.</p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-8 py-16 sm:py-20">
        <h2 className="text-[1.9rem] sm:text-[2.4rem] leading-[1.08] tracking-[-0.035em] font-bold max-w-[22ch]">Everything a scattered history needs</h2>
        <ul className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
          {FEATURES.map((f) => (
            <li key={f.t} className="grid grid-cols-[2.5rem_1fr] gap-x-4">
              <span className="grid h-10 w-10 place-items-center rounded-xl text-white" style={{ background: f.color }}><f.icon size={19} strokeWidth={2} aria-hidden /></span>
              <div>
                <h3 className="text-lg font-bold tracking-[-0.02em]">{f.t}</h3>
                <p className="mt-1.5 text-ink-2">{f.d}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section className="border-y border-rule bg-raised">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8 py-16 sm:py-20">
          <h2 className="text-[1.9rem] sm:text-[2.4rem] leading-[1.08] tracking-[-0.035em] font-bold">How it works</h2>
          <ol className="mt-12 grid gap-10 md:grid-cols-3">
            {[
              { c: "var(--color-c-heart)", t: "Add your records", d: "Photograph or upload what you have. Check what was read, fix anything, confirm." },
              { c: "var(--color-c-meta)", t: "See the whole picture", d: "Your medicines, results and visits line up in one place, with anything worth a second look flagged." },
              { c: "var(--color-c-fluid)", t: "Share on your terms", d: "Give a doctor access for a visit, a week or a month. Revoke it any time with one tap." },
            ].map((s) => (
              <li key={s.t}>
                <span className="block h-2 w-16 rounded-full" style={{ background: s.c }} aria-hidden />
                <h3 className="mt-5 text-lg font-bold tracking-[-0.02em]">{s.t}</h3>
                <p className="mt-2 text-ink-2">{s.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-8 py-16 sm:py-20 grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
        <h2 className="text-[1.9rem] sm:text-[2.4rem] leading-[1.08] tracking-[-0.035em] font-bold flex items-start gap-3"><ShieldCheck size={34} className="text-brand mt-1 shrink-0" aria-hidden /> Private by design</h2>
        <ul className="space-y-3.5 text-[1.05rem] text-ink-2 max-w-[62ch]">
          <li>A doctor sees nothing without your active permission, enforced inside the database itself.</li>
          <li>Original documents stay in private storage and open only through short-lived, checked links.</li>
          <li>Share links carry no personal data, and the access log cannot be edited by anyone.</li>
          <li>The AI reads and summarises. It never diagnoses, and every flag shows its evidence and source.</li>
        </ul>
      </section>

      <section className="mx-auto max-w-[1240px] px-4 sm:px-8 pb-20">
        <div className="rounded-3xl bg-ink text-canvas px-6 sm:px-12 py-12 sm:py-14 flex flex-wrap items-center justify-between gap-6">
          <h2 className="text-[1.7rem] sm:text-[2.2rem] leading-[1.1] tracking-[-0.035em] font-bold max-w-[20ch]">Bring your whole story to every doctor.</h2>
          <Link href="/signup" className="inline-flex items-center gap-2 min-h-12 px-6 rounded-[10px] bg-brand text-on-brand font-semibold hover:bg-brand-deep">Create your record <ArrowRight size={18} /></Link>
        </div>
      </section>

      <footer className="border-t border-rule">
        <div className="mx-auto max-w-[1240px] px-4 sm:px-8 py-6 flex flex-wrap items-center justify-between gap-4 text-sm text-ink-2">
          <span>Continuum · built for the IIITDM Kancheepuram Web Hackathon</span>
          <DemoReset />
        </div>
      </footer>
    </div>
  );
}
