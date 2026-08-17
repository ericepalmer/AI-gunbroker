import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getSession } from "@/lib/session";

export default async function PrivacyPage() {
  const session = await getSession();
  return (
    <>
      <SiteHeader signedIn={Boolean(session)} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <h1 className="font-serif text-5xl tracking-tight">Privacy</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            We store the account details you provide (name, email, password hash)
            and, later, API credentials for GunBroker, ShipStation, and
            WooCommerce so the desk can act on your behalf.
          </p>
          <p>
            Marketplace credentials will be encrypted at rest. We do not sell
            customer lists. Session cookies keep you signed in.
          </p>
          <p>This stub will be replaced with a full privacy policy before paid plans launch.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
