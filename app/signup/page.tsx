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
        <SignupForm initialRole={role} />
      </div>
    </PublicShell>
  );
}
