import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import { buttonVariants } from "@/components/ui/button";
import { getSession } from "@/lib/session";
import { cn } from "@/lib/utils";
import Link from "next/link";

const plans = [
  {
    name: "Desk",
    price: "Free while we build",
    blurb: "Account, settings, and the inventory workflow as it ships.",
    items: ["Email login and password reset", "Admin for the shop owner", "Inventory and sold pages as they land"],
  },
  {
    name: "Seller",
    price: "Subscription later",
    blurb: "GunBroker sync, relist, and ShipStation handoff for a working ammo shop.",
    items: ["Pull and push listings", "Date, price, and quantity edits", "Sold orders to ShipStation"],
    featured: true,
  },
  {
    name: "Shop",
    price: "Subscription later",
    blurb: "Adds WooCommerce quantity sync if the store API (or a plugin) is the right fit.",
    items: ["Everything in Seller", "WooCommerce quantity bridge", "Priority onboarding"],
  },
];

export default async function PricingPage() {
  const session = await getSession();

  return (
    <>
      <SiteHeader signedIn={Boolean(session)} />
      <main className="flex-1">
        <section className="mx-auto max-w-6xl px-4 py-16">
          <p className="text-sm uppercase tracking-[0.2em] text-accent">Pricing</p>
          <h1 className="mt-3 max-w-2xl font-serif text-5xl tracking-tight">
            A seller plan will sit here. The account system is ready now.
          </h1>
          <p className="mt-4 max-w-2xl text-muted-foreground">
            Billing is not wired yet. Create an account so you are on the desk
            when GunBroker and ShipStation connections ship.
          </p>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <article
                key={plan.name}
                className={cn(
                  "rounded-2xl border bg-card p-6",
                  plan.featured ? "border-accent" : "border-border",
                )}
              >
                <h2 className="font-serif text-3xl">{plan.name}</h2>
                <p className="mt-2 text-sm text-accent">{plan.price}</p>
                <p className="mt-3 text-sm text-muted-foreground">{plan.blurb}</p>
                <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
                  {plan.items.map((item) => (
                    <li key={item}>• {item}</li>
                  ))}
                </ul>
                <Link
                  href="/signup"
                  className={cn(
                    buttonVariants({
                      variant: plan.featured ? "default" : "secondary",
                    }),
                    "mt-6 w-full",
                  )}
                >
                  Create account
                </Link>
              </article>
            ))}
          </div>
        </section>
      </main>
      <SiteFooter />
    </>
  );
}
