import { Badge } from "@/components/ui/badge";
import { getSession } from "@/lib/session";
import Link from "next/link";

export default async function AppHomePage() {
  const session = await getSession();

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-accent">Overview</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">
        Welcome, {session?.user.name.split(" ")[0] ?? "seller"}.
      </h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Account, GunBroker connection, and inventory import are live. Relist,
        ShipStation, and WooCommerce are next.
      </p>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          {
            href: "/app/inventory",
            title: "Inventory",
            body: "GunBroker listings, dates, prices, quantities, and a back-sync.",
            badge: "Live",
          },
          {
            href: "/app/sold",
            title: "Sold / ship",
            body: "Closed orders from GunBroker into ShipStation.",
            badge: "Planned",
          },
          {
            href: "/app/settings",
            title: "Connections",
            body: "GunBroker, ShipStation, and WooCommerce credentials live under Settings.",
            badge: "Stub",
          },
        ].map((card) => (
          <Link
            key={card.href}
            href={card.href}
            className="rounded-2xl border border-border bg-card p-5 hover:border-accent/50"
          >
            <Badge>{card.badge}</Badge>
            <h2 className="mt-3 font-serif text-2xl">{card.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{card.body}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
