import { AuthShell } from "@/components/auth-shell";
import { ResetPasswordForm } from "@/components/auth-forms";
import Link from "next/link";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <AuthShell
      title="Choose a new password"
      subtitle="Use at least 8 characters. This signs you out of other sessions after you save."
    >
      {token ? (
        <ResetPasswordForm token={token} />
      ) : (
        <p className="text-sm text-muted-foreground">
          This reset link is missing a token. Request a new one from{" "}
          <Link href="/forgot-password" className="text-accent hover:underline">
            forgot password
          </Link>
          .
        </p>
      )}
    </AuthShell>
  );
}
