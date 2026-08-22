import Link from "next/link";
import { ImportInventoryButton } from "@/components/import-inventory-button";
import { ImportStoreButton } from "@/components/import-store-button";
import { UpdateShipStationButton } from "@/components/update-shipstation-button";
import { listLocalSoldOrders } from "@/lib/gunbroker/orders";
import { isGunBrokerConnected } from "@/lib/gunbroker/service";
import { getIntegrationLastSyncedAt } from "@/lib/integration-sync";
import { getSession } from "@/lib/session";
import { isShipStationConnected } from "@/lib/shipstation/service";
import { SHIPSTATION_PROVIDER } from "@/lib/shipstation/config";
import { isOrderShipped } from "@/lib/sold-order-filters";
import { isWooCommerceConnected, listLocalWooProducts } from "@/lib/woocommerce/service";
import { linkedDiscrepancy } from "@/lib/woocommerce/types";
import { prisma } from "@/lib/prisma";

async function latestListingImportedAt(userId: string) {
  const row = await prisma.listing.aggregate({
    where: { userId },
    _max: { lastImportedAt: true },
  });
  return row._max.lastImportedAt?.toISOString() ?? null;
}

async function latestWooImportedAt(userId: string) {
  const row = await prisma.wooProduct.aggregate({
    where: { userId },
    _max: { lastImportedAt: true },
  });
  return row._max.lastImportedAt?.toISOString() ?? null;
}

function DashboardStat({
  href,
  value,
  label,
  detail,
}: {
  href: string;
  value: number;
  label: string;
  detail: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 rounded-lg border border-border bg-card px-4 py-3 transition-colors hover:border-accent/50"
    >
      <p className="w-12 shrink-0 text-right text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      <div className="min-w-0 border-l border-border pl-4">
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="mt-0.5 text-xs leading-snug text-muted-foreground">{detail}</p>
      </div>
    </Link>
  );
}

function ServiceSyncCard({
  button,
  stats,
}: {
  button: React.ReactNode;
  stats: { label: string; value: number }[];
}) {
  return (
    <div className="rounded-lg border border-border bg-card p-3">
      <div className="flex justify-center">{button}</div>
      <dl className="mt-3 space-y-1 border-t border-border pt-2.5 text-xs">
        {stats.map((stat) => (
          <div key={stat.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground">{stat.label}</dt>
            <dd className="font-medium tabular-nums text-foreground">{stat.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function soldInLastDays(orderDateIso: string | null, days: number) {
  if (!orderDateIso) return false;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  return new Date(orderDateIso).getTime() >= cutoff;
}

export default async function AppHomePage() {
  const session = await getSession();
  const userId = session!.user.id;
  const firstName = session?.user.name.split(" ")[0] ?? "seller";

  const [
    gunBrokerConnected,
    wooConnected,
    shipStationConnected,
    orders,
    products,
    lastShipStationSyncedAt,
    listingImportedAt,
    wooImportedAt,
    listingTotal,
    linkedListingIds,
  ] = await Promise.all([
    isGunBrokerConnected(userId),
    isWooCommerceConnected(userId),
    isShipStationConnected(userId),
    listLocalSoldOrders(userId),
    listLocalWooProducts(userId),
    getIntegrationLastSyncedAt(userId, SHIPSTATION_PROVIDER),
    latestListingImportedAt(userId),
    latestWooImportedAt(userId),
    prisma.listing.count({ where: { userId } }),
    prisma.wooProduct.findMany({
      where: { userId, linkedItemId: { not: null } },
      select: { linkedItemId: true },
      distinct: ["linkedItemId"],
    }),
  ]);

  const needsShipCount = orders.filter((order) => !isOrderShipped(order)).length;
  const mismatchCount = products.filter(linkedDiscrepancy).length;
  const gunBrokerLastSynced = listingImportedAt;
  const wooLastSynced = wooImportedAt;

  const gbLinked = linkedListingIds.length;
  const gbTotal = listingTotal;
  const wcLinked = products.filter((product) => Boolean(product.linkedListing)).length;
  const wcTotal = products.length;
  const soldLast90 = orders.filter((order) => soldInLastDays(order.orderDate, 90)).length;

  return (
    <div className="mx-auto max-w-3xl px-6 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Dashboard</p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Welcome, {firstName}.</h1>
      <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
        Sync your connections, then clear what still needs shipping or a quantity fix.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <ServiceSyncCard
          button={
            <ImportInventoryButton
              connected={gunBrokerConnected}
              idleLabel="Sync GunBroker"
              lastSyncedAt={gunBrokerLastSynced}
              connectHref="/app/settings?tab=connections#connection-gunbroker"
            />
          }
          stats={[
            { label: "Linked products", value: gbLinked },
            { label: "Total products", value: gbTotal },
          ]}
        />
        <ServiceSyncCard
          button={
            <ImportStoreButton
              connected={wooConnected}
              idleLabel="Sync WooCommerce"
              lastSyncedAt={wooLastSynced}
              connectHref="/app/settings?tab=connections#connection-woocommerce"
            />
          }
          stats={[
            { label: "Linked products", value: wcLinked },
            { label: "Total products", value: wcTotal },
          ]}
        />
        <ServiceSyncCard
          button={
            <UpdateShipStationButton
              connected={shipStationConnected}
              idleLabel="Sync ShipStation"
              lastSyncedAt={lastShipStationSyncedAt}
              connectHref="/app/settings?tab=connections#connection-shipstation"
            />
          }
          stats={[{ label: "Sold in last 90 days", value: soldLast90 }]}
        />
      </div>

      <section className="mt-8">
        <h2 className="text-sm font-medium text-foreground">Needed Actions</h2>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          <DashboardStat
            href="/app/sold"
            value={needsShipCount}
            label="Sold · need to ship"
            detail="In-progress orders that are not complete yet."
          />
          <DashboardStat
            href="/app/inventory/gunbroker"
            value={mismatchCount}
            label="Linked discrepancies"
            detail="Linked items where qty or price differs between Woo and GunBroker."
          />
        </div>
      </section>
    </div>
  );
}
