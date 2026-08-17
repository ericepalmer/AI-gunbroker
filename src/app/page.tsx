import { LandingPage } from "@/components/landing-page";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getSession } from "@/lib/session";

export default async function Home() {
  const session = await getSession();

  return (
    <>
      <SiteHeader signedIn={Boolean(session)} />
      <main className="flex-1">
        <LandingPage signedIn={Boolean(session)} />
      </main>
      <SiteFooter />
    </>
  );
}
