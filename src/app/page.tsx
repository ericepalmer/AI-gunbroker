import { LandingPage } from "@/components/landing-page";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { getSession } from "@/lib/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getSession();
  if (session) {
    redirect("/app");
  }

  return (
    <>
      <SiteHeader signedIn={false} />
      <main className="flex-1">
        <LandingPage signedIn={false} />
      </main>
      <SiteFooter />
    </>
  );
}
