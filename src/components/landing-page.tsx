import Image from "next/image";
import Link from "next/link";
import {
  ArrowRight,
  Boxes,
  CalendarClock,
  RefreshCw,
  ShieldCheck,
  Store,
  Truck,
} from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const features = [
  {
    title: "Inventory desk",
    body: "Pull GunBroker listings into one table. Change end dates, prices, and quantities without hunting through their screens.",
    icon: Boxes,
    status: "Next",
  },
  {
    title: "Rebuild ended listings",
    body: "When an auction ends, relist from the last good version instead of re-entering titles, photos, and shipping rules.",
    icon: RefreshCw,
    status: "Next",
  },
  {
    title: "Sold → ShipStation",
    body: "Closed GunBroker orders become ShipStation shipments so you are not copying buyer addresses by hand.",
    icon: Truck,
    status: "Planned",
  },
  {
    title: "WooCommerce quantities",
    body: "Keep store stock in step with GunBroker. If a plugin is required, we will add it after the native REST options are exhausted.",
    icon: Store,
    status: "Later",
  },
];

export function LandingPage({ signedIn }: { signedIn: boolean }) {
  return (
    <div>
      <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 lg:grid-cols-2 lg:py-24">
        <div>
          <Badge tone="accent">For ammo and firearms sellers</Badge>
          <h1 className="mt-5 font-serif text-5xl leading-[1.05] tracking-tight md:text-6xl">
            List, track, and ship GunBroker inventory without the busywork.
          </h1>
          <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Chamber is the operations desk GunBroker never built: pull listings,
            update dates and prices, rebuild ended auctions, and hand sold orders
            to ShipStation.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            {signedIn ? (
              <Link href="/app" className={cn(buttonVariants({ size: "lg" }))}>
                Open your desk
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <>
                <Link href="/signup" className={cn(buttonVariants({ size: "lg" }))}>
                  Create a free account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/login"
                  className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
                >
                  Log in
                </Link>
              </>
            )}
          </div>
          <p className="mt-4 text-sm text-muted-foreground">
            Built for high-volume ammo first. Firearms listings are supported with
            the same workflow.
          </p>
        </div>
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card">
          <Image
            src="/images/hero-inventory.png"
            alt="Chamber inventory desk showing ammunition listings, prices, quantities, and end dates"
            width={1536}
            height={1024}
            priority
            className="h-auto w-full"
          />
        </div>
      </section>

      <section id="features" className="border-t border-border bg-card/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-sm uppercase tracking-[0.2em] text-accent">What it does</p>
          <h2 className="mt-3 max-w-2xl font-serif text-4xl tracking-tight">
            The parts of GunBroker that waste an afternoon, in one place.
          </h2>
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {features.map((feature) => (
              <div
                key={feature.title}
                className="rounded-2xl border border-border bg-background p-6"
              >
                <div className="flex items-center justify-between">
                  <feature.icon className="h-5 w-5 text-accent" />
                  <Badge>{feature.status}</Badge>
                </div>
                <h3 className="mt-4 font-serif text-2xl">{feature.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-8 px-4 py-20 lg:grid-cols-2">
        <figure className="overflow-hidden rounded-2xl border border-border">
          <Image
            src="/images/feature-relist.png"
            alt="Listing worksheet and calendar used to rebuild an ended GunBroker auction"
            width={1536}
            height={1024}
            className="h-auto w-full"
          />
          <figcaption className="border-t border-border bg-card px-5 py-4 text-sm text-muted-foreground">
            Relist from the last good auction instead of starting from a blank form.
          </figcaption>
        </figure>
        <figure className="overflow-hidden rounded-2xl border border-border">
          <Image
            src="/images/feature-shipping.png"
            alt="Packing station with cartons, scale, and shipping label printer"
            width={1536}
            height={1024}
            className="h-auto w-full"
          />
          <figcaption className="border-t border-border bg-card px-5 py-4 text-sm text-muted-foreground">
            Sold orders move into ShipStation so labels are not a second data-entry job.
          </figcaption>
        </figure>
      </section>

      <section id="how-it-works" className="border-y border-border bg-card/40 py-20">
        <div className="mx-auto max-w-6xl px-4">
          <p className="text-sm uppercase tracking-[0.2em] text-accent">How it works</p>
          <h2 className="mt-3 font-serif text-4xl tracking-tight">Three connections. One desk.</h2>
          <ol className="mt-10 grid gap-4 md:grid-cols-3">
            {[
              {
                step: "01",
                title: "Connect GunBroker",
                body: "Authenticate your seller account. Chamber pulls live and ended listings so you can edit dates, prices, and quantities.",
                icon: CalendarClock,
              },
              {
                step: "02",
                title: "Connect ShipStation",
                body: "When a listing sells, the order is created in ShipStation with the buyer and item details you already captured.",
                icon: Truck,
              },
              {
                step: "03",
                title: "Optional WooCommerce",
                body: "If you also sell from a store, quantities can follow the GunBroker count. Native REST first; a plugin only if needed.",
                icon: Store,
              },
            ].map((item) => (
              <li key={item.step} className="rounded-2xl border border-border bg-background p-6">
                <p className="text-xs tracking-[0.2em] text-accent">{item.step}</p>
                <item.icon className="mt-4 h-5 w-5 text-accent" />
                <h3 className="mt-3 font-serif text-2xl">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{item.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-20">
        <div className="rounded-3xl border border-border bg-card p-8 md:p-12">
          <div className="grid gap-8 md:grid-cols-[1.4fr_.8fr] md:items-center">
            <div>
              <p className="text-sm uppercase tracking-[0.2em] text-accent">Subscriptions</p>
              <h2 className="mt-3 font-serif text-4xl tracking-tight">
                Pricing comes after the workflow is real.
              </h2>
              <p className="mt-4 max-w-xl text-muted-foreground">
                The landing page is already wired for a seller plan. For now, create
                an account and we will turn on GunBroker, ShipStation, and store
                sync in order.
              </p>
            </div>
            <div className="flex flex-col gap-3">
              <Link href="/pricing" className={cn(buttonVariants({ size: "lg" }))}>
                View the plan stub
              </Link>
              <Link
                href="/signup"
                className={cn(buttonVariants({ variant: "secondary", size: "lg" }))}
              >
                Sign up anyway
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-border py-16">
        <div className="mx-auto flex max-w-6xl items-start gap-4 px-4 text-sm text-muted-foreground">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <p>
            You remain responsible for FFL transfers, prohibited-person checks,
            shipping hazmat rules for ammunition, and marketplace policy. Chamber
            is bookkeeping and fulfillment software, not a storefront and not legal
            advice.
          </p>
        </div>
      </section>
    </div>
  );
}
