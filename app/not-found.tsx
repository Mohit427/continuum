import Link from "next/link";
import { PublicShell, Denied } from "@/components/PublicShell";
import { buttonClass } from "@/components/ui";

export default function NotFound() {
  return (
    <PublicShell>
      <Denied title="This page isn't here" body="The page you asked for does not exist, or you don't have access to it." />
      <div className="text-center"><Link href="/" className={buttonClass("secondary")}>Back to Continuum</Link></div>
    </PublicShell>
  );
}
