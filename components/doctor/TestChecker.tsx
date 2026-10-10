"use client";
import { useState, useTransition } from "react";
import { CheckCircle2, CircleAlert } from "lucide-react";
import { checkTestAction, logTestDecision } from "@/app/actions/doctor";
import { LABS } from "@/lib/kb/labs";
import { Button, cn } from "../ui";

type Result = Awaited<ReturnType<typeof checkTestAction>>;

/** "Ordering a test?": shows the last result and whether it's still recent; reusing it adds to the ₹-saved counter. */
export function TestChecker({ patientId, savedInr }: { patientId: string; savedInr: number }) {
  const [key, setKey] = useState("hba1c");
  const [res, setRes] = useState<Result | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [total, setTotal] = useState(savedInr);
  const [pending, start] = useTransition();
  const tests = LABS.filter((l) => l.category === "lab" && l.retestDays);

  return (
    <section className="border border-rule rounded-2xl bg-raised p-5" aria-labelledby="tc-h">
      <h2 id="tc-h" className="text-lg font-semibold">Ordering a test?</h2>
      <p className="text-sm text-ink-2 mt-0.5">Check the last result from any lab first.</p>
      <div className="mt-3 flex gap-2">
        <select className="field" value={key} onChange={(e) => { setKey(e.target.value); setRes(null); setDone(null); }} aria-label="Test">
          {tests.map((t) => <option key={t.key} value={t.key}>{t.name}</option>)}
        </select>
        <Button disabled={pending} onClick={() => start(async () => { setDone(null); setRes(await checkTestAction(patientId, key)); })}>Check</Button>
      </div>
      {res && (
        <div className={cn("mt-3 rounded-xl p-3 text-sm", res.stillValid ? "bg-ok-soft" : "bg-sunk")} role="status">
          <p className="flex gap-2">{res.stillValid ? <CheckCircle2 size={18} className="text-ok shrink-0" /> : <CircleAlert size={18} className="text-ink-2 shrink-0" />}<span>{res.message}</span></p>
          {!done && "testKey" in res && (
            <div className="mt-3 flex flex-wrap gap-2">
              {res.stillValid && <Button size="sm" onClick={() => start(async () => { await logTestDecision(patientId, key, true); setDone("Reused the existing result."); setTotal((t) => t + res.priceInr); })}>Use this result{res.priceInr ? ` · save ₹${res.priceInr}` : ""}</Button>}
              <Button size="sm" variant="secondary" onClick={() => start(async () => { await logTestDecision(patientId, key, false); setDone("Noted: ordering a new test."); })}>Order anyway</Button>
            </div>
          )}
          {done && <p className="mt-2 font-semibold">{done}</p>}
        </div>
      )}
      <p className="mt-3 text-sm text-ink-2">Saved for this patient so far: <strong className="text-ink">₹{total.toLocaleString("en-IN")}</strong></p>
    </section>
  );
}
