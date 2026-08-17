import { AuthShell } from "@/components/auth-shell";
import { SignupForm } from "@/components/auth-forms";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function SignupPage() {
  const session = await getSession();
  if (session) {
    redirect("/app");
  }

  return (
    <AuthShell
      title="Open a Chamber desk"
      subtitle="Create an account now. GunBroker, ShipStation, and WooCommerce connections come next."
    >
      <SignupForm />
    </AuthShell>
  );
}
