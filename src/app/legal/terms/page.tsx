import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getSession } from "@/lib/session";

export default async function TermsPage() {
  const session = await getSession();
  return (
    <>
      <SiteHeader signedIn={Boolean(session)} />
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-16">
        <h1 className="font-serif text-5xl tracking-tight">Terms of use</h1>
        <div className="mt-6 space-y-4 text-sm leading-relaxed text-muted-foreground">
          <p>
            Chamber is software for managing your own marketplace listings and
            shipments. You are responsible for following GunBroker rules, federal
            and state firearms law, FFL requirements, and carrier rules for
            ammunition.
          </p>
          <p>
            Do not use Chamber to list, sell, or ship to prohibited persons, or
            to evade marketplace or legal restrictions. We may suspend accounts
            that abuse the service.
          </p>
          <p>This stub will be replaced with counsel-reviewed terms before paid plans launch.</p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
