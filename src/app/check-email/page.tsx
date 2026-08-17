import { AuthShell } from "@/components/auth-shell";
import Link from "next/link";

export default async function CheckEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string }>;
}) {
  const { email } = await searchParams;

  return (
    <AuthShell
      title="Check your email"
      subtitle={
        email
          ? `We sent a verification link to ${email}. Confirm it before signing in.`
          : "We sent a verification link. Confirm it before signing in."
      }
    >
      <div className="space-y-4 text-sm text-muted-foreground">
        <p>
          Did not get it? Wait a minute, check spam, or sign in again to resend
          the message.
        </p>
        {process.env.NODE_ENV !== "production" ? (
          <p>
            Local development stores mail in the{" "}
            <Link href="/dev/inbox" className="text-accent hover:underline">
              dev inbox
            </Link>
            . The same link is printed in the server terminal.
          </p>
        ) : null}
        <p>
          <Link href="/login" className="text-accent hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
