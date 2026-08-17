import { AppSidebar } from "@/components/app-sidebar";
import { ImpersonationBanner } from "@/components/impersonation-banner";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/login?next=/app");
  }

  const impersonating =
    "impersonatedBy" in session.session && Boolean(session.session.impersonatedBy);

  return (
    <div className="flex min-h-full flex-1">
      <AppSidebar user={session.user} />
      <div className="min-w-0 flex-1 overflow-auto">
        {impersonating ? <ImpersonationBanner /> : null}
        {children}
      </div>
    </div>
  );
}
