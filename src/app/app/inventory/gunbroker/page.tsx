import { ImportInventoryButton } from "@/components/import-inventory-button";
import { gunBrokerTabItems } from "@/components/inventory-grid";
import { GunBrokerStatusView } from "@/components/gunbroker-status-view";
import { SyncSoldOrdersButton } from "@/components/sync-sold-orders-button";
import { listLocalInventory } from "@/lib/gunbroker/listings";
import { listLocalSoldOrders } from "@/lib/gunbroker/orders";
import { GUNBROKER_PROVIDER } from "@/lib/gunbroker/config";
import { isGunBrokerConnected } from "@/lib/gunbroker/service";
import { getIntegrationLastSyncedAt } from "@/lib/integration-sync";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/session";
import { isShipStationConnected } from "@/lib/shipstation/service";
import { isGunBrokerUnshippedOrder } from "@/lib/sold-order-filters";
import { listLocalWooProducts } from "@/lib/woocommerce/service";
import Link from "next/link";

export default async function GunBrokerInventoryPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const [
    connected,
    shipStationConnected,
    listings,
    products,
    soldOrders,
    latestImport,
    lastOrdersSyncedAt,
  ] = await Promise.all([
    isGunBrokerConnected(userId),
    isShipStationConnected(userId),
    listLocalInventory(userId),
    listLocalWooProducts(userId),
    listLocalSoldOrders(userId),
    prisma.listing.aggregate({
      where: { userId },
      _max: { lastImportedAt: true },
    }),
    getIntegrationLastSyncedAt(userId, GUNBROKER_PROVIDER),
  ]);
  const lastSyncedAt = latestImport._max.lastImportedAt?.toISOString() ?? null;
  const unshippedOrders = soldOrders.filter(isGunBrokerUnshippedOrder);

  return (
    <div className="px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">GunBroker Status</p>
        <div className="flex flex-wrap items-center gap-2">
          <SyncSoldOrdersButton connected={connected} lastSyncedAt={lastOrdersSyncedAt} />
          <ImportInventoryButton connected={connected} lastSyncedAt={lastSyncedAt} />
        </div>
      </div>
      {!connected ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Connect GunBroker in{" "}
          <Link
            href="/app/settings?tab=connections"
            className="text-accent underline-offset-4 hover:underline"
          >
            Settings
          </Link>{" "}
          before importing. WooCommerce items marked as a GunBroker source still appear here.
        </p>
      ) : null}
      <GunBrokerStatusView
        items={gunBrokerTabItems(listings, products)}
        products={products}
        unshippedOrders={unshippedOrders}
        shipStationConnected={shipStationConnected}
        emptyMessage="No listings yet. Import from GunBroker, or mark WooCommerce items as a GunBroker source."
      />
    </div>
  );
}
