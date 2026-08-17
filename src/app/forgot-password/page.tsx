import { AuthShell } from "@/components/auth-shell";
import { ForgotPasswordForm } from "@/components/auth-forms";

export default function ForgotPasswordPage() {
  return (
    <AuthShell
      title="Reset password"
      subtitle="We will email a link if that address has a Chamber account. In local development, the link also lands in the dev inbox."
    >
      <ForgotPasswordForm />
    </AuthShell>
  );
}
