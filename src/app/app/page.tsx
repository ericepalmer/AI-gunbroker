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
import { isWooCommerceConnected, listLocalWooProducts } from "@/lib/woocommerce/service";
import { quantityMismatch } from "@/lib/woocommerce/types";
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
  ] = await Promise.all([
    isGunBrokerConnected(userId),
    isWooCommerceConnected(userId),
    isShipStationConnected(userId),
    listLocalSoldOrders(userId),
    listLocalWooProducts(userId),
    getIntegrationLastSyncedAt(userId, SHIPSTATION_PROVIDER),
    latestListingImportedAt(userId),
    latestWooImportedAt(userId),
  ]);

  const soldCount = orders.length;
  const mismatchCount = products.filter(quantityMismatch).length;
  // Inventory sync buttons use listing/product import times, not sold-order sync.
  const gunBrokerLastSynced = listingImportedAt;
  const wooLastSynced = wooImportedAt;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <p className="text-sm uppercase tracking-[0.2em] text-accent">Dashboard</p>
      <h1 className="mt-2 font-serif text-4xl tracking-tight">Welcome, {firstName}.</h1>
      <p className="mt-3 max-w-2xl text-muted-foreground">
        Sync your connections, then review sold orders and linked inventory that is out of step.
      </p>

      <div className="mt-8 flex flex-wrap items-center gap-2">
        <ImportInventoryButton
          connected={gunBrokerConnected}
          idleLabel="Sync GunBroker"
          lastSyncedAt={gunBrokerLastSynced}
        />
        <ImportStoreButton
          connected={wooConnected}
          idleLabel="Sync WooCommerce"
          lastSyncedAt={wooLastSynced}
        />
        <UpdateShipStationButton
          connected={shipStationConnected}
          idleLabel="Sync ShipStation"
          lastSyncedAt={lastShipStationSyncedAt}
        />
      </div>
      {!gunBrokerConnected || !wooConnected || !shipStationConnected ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Connect missing services in{" "}
          <Link
            href="/app/settings?tab=connections"
            className="text-accent underline-offset-4 hover:underline"
          >
            Settings
          </Link>
          .
        </p>
      ) : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <Link
          href="/app/sold"
          className="rounded-2xl border border-border bg-card p-5 hover:border-accent/50"
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">Sold items</p>
          <p className="mt-3 font-serif text-5xl tabular-nums tracking-tight">{soldCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Orders pulled from GunBroker. Open Sold / ship to work the queue.
          </p>
        </Link>
        <Link
          href="/app/inventory/woocommerce"
          className="rounded-2xl border border-border bg-card p-5 hover:border-accent/50"
        >
          <p className="text-xs uppercase tracking-[0.18em] text-muted-foreground">
            Linked qty mismatch
          </p>
          <p className="mt-3 font-serif text-5xl tabular-nums tracking-tight">{mismatchCount}</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Linked WooCommerce ↔ GunBroker items where stock quantities do not match.
          </p>
        </Link>
      </div>
    </div>
  );
}
