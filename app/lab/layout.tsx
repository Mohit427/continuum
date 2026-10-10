import { requireRole } from "@/lib/auth";
import { TopBar } from "@/components/shell/TopBar";

export default async function LabLayout({ children }: LayoutProps<"/lab">) {
  const { profile } = await requireRole("lab");
  return (
    <>
      <TopBar profile={profile} />
      <main className="flex-1 mx-auto w-full max-w-[1100px] px-4 sm:px-8 py-6 sm:py-8">{children}</main>
    </>
  );
}
