import Link from "next/link";
import { Info } from "lucide-react";
import { SoldOrdersView } from "@/components/sold-orders-view";
import { SyncSoldOrdersButton } from "@/components/sync-sold-orders-button";
import { UpdateShipStationButton } from "@/components/update-shipstation-button";
import { listLocalSoldOrders } from "@/lib/gunbroker/orders";
import { isGunBrokerConnected } from "@/lib/gunbroker/service";
import { isShipStationConnected } from "@/lib/shipstation/service";
import { getSession } from "@/lib/session";
import { getIntegrationLastSyncedAt } from "@/lib/integration-sync";
import { GUNBROKER_PROVIDER } from "@/lib/gunbroker/config";
import { SHIPSTATION_PROVIDER } from "@/lib/shipstation/config";

export default async function SoldPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const [connected, shipStationConnected, orders, lastGunBrokerSyncedAt, lastShipStationSyncedAt] =
    await Promise.all([
      isGunBrokerConnected(userId),
      isShipStationConnected(userId),
      listLocalSoldOrders(userId),
      getIntegrationLastSyncedAt(userId, GUNBROKER_PROVIDER),
      getIntegrationLastSyncedAt(userId, SHIPSTATION_PROVIDER),
    ]);

  return (
    <div className="px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="group relative inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-accent">
            Sold / ship
            <span className="relative inline-flex">
              <Info className="size-3.5 text-muted-foreground" aria-hidden />
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full left-0 z-20 mt-1.5 hidden w-64 rounded-md border border-border bg-card px-2 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal text-foreground shadow-lg group-hover:block group-focus-within:block"
              >
                Sync sold orders from the last 90 days. Send each order to ShipStation, then use
                Update ShipStation to pull shipped status and tracking.
              </span>
            </span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <SyncSoldOrdersButton connected={connected} lastSyncedAt={lastGunBrokerSyncedAt} />
          <UpdateShipStationButton
            connected={shipStationConnected}
            lastSyncedAt={lastShipStationSyncedAt}
          />
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
          before syncing sold orders.
        </p>
      ) : null}
      <div className="mt-4">
        <SoldOrdersView orders={orders} shipStationConnected={shipStationConnected} />
      </div>
    </div>
  );
}
