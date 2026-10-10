import { PublicShell } from "@/components/PublicShell";
import { SignupForm } from "./SignupForm";

export const metadata = { title: "Create account" };

export default async function Signup({ searchParams }: PageProps<"/signup">) {
  const sp = await searchParams;
  const role = sp.role === "doctor" || sp.role === "lab" ? sp.role : "patient";
  return (
    <PublicShell>
      <div className="mx-auto max-w-xl py-6">
        <h1 className="text-[1.75rem] sm:text-[2rem] leading-tight">Create your account</h1>
        {sp.error === "form" && <p role="alert" className="mt-4 font-semibold text-flag">Some details were missing or invalid. Please check the form and try again.</p>}
        <SignupForm initialRole={role} />
      </div>
    </PublicShell>
  );
}
