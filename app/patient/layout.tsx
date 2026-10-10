import { requireRole } from "@/lib/auth";
import { TopBar } from "@/components/shell/TopBar";
import { Assistant } from "@/components/assistant/Assistant";

export default async function PatientLayout({ children }: LayoutProps<"/patient">) {
  const { profile } = await requireRole("patient");
  return (
    <>
      <TopBar profile={profile} />
      <main className="flex-1 mx-auto w-full max-w-[1360px] px-4 sm:px-8 py-6 sm:py-8">{children}</main>
      <Assistant role="patient" />
    </>
  );
}
