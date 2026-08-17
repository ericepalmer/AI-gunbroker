import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/auth-forms";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const session = await getSession();
  const params = await searchParams;
  const nextPath = params.next?.startsWith("/") ? params.next : "/app";
  if (session) {
    redirect(nextPath);
  }

  return (
    <AuthShell
      title="Welcome back"
      subtitle={
        params.reset
          ? "Password updated. Sign in with the new one."
          : "Sign in to manage listings, sold orders, and shipping connections."
      }
    >
      <LoginForm nextPath={nextPath} />
    </AuthShell>
  );
}
