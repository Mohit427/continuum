import Link from "next/link";
import { LoginForm } from "./LoginForm";
import { PublicShell } from "@/components/PublicShell";
import { demoLogin } from "@/app/actions/auth";

export const metadata = { title: "Sign in" };

export default async function Login({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "";
  return (
    <PublicShell>
      <div className="mx-auto max-w-md py-6">
        <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">Sign in</h1>
        <p className="text-ink-2 mt-1">Patients, doctors and labs use the same sign-in. You land in your own area.</p>
        {sp.error === "demo" && <p role="alert" className="mt-4 font-semibold text-flag">Demo accounts are not set up yet. Run the seed or reset the demo from the home page.</p>}
        <LoginForm next={next} />
        <p className="mt-6 text-ink-2">New here? <Link href="/signup" className="font-semibold text-brand hover:underline">Create an account</Link></p>
        <div className="mt-8 border-t border-rule pt-6">
          <p className="label">Or try a demo account</p>
          <div className="flex flex-wrap gap-2">
            {[["lakshmi", "Lakshmi (patient)"], ["arjun", "Arjun (patient)"], ["dr.iyer", "Dr. Iyer (cardiology)"], ["dr.menon", "Dr. Menon (endocrinology)"], ["citycare", "CityCare (lab)"]].map(([a, l]) => (
              <form key={a} action={demoLogin.bind(null, a)}><button className="min-h-10 px-3 rounded-xl border border-rule text-sm font-semibold hover:border-brand hover:text-brand">{l}</button></form>
            ))}
          </div>
        </div>
      </div>
    </PublicShell>
  );
}
