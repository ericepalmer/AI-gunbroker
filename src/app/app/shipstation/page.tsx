import Link from "next/link";
import { Info } from "lucide-react";
import { ShipStationDeskView } from "@/components/shipstation-desk-view";
import { UpdateShipStationTrackingButton } from "@/components/update-shipstation-tracking-button";
import { getIntegrationLastSyncedAt } from "@/lib/integration-sync";
import { getSession } from "@/lib/session";
import { SHIPSTATION_PROVIDER } from "@/lib/shipstation/config";
import { listShipStationAwaiting } from "@/lib/shipstation/desk";
import { isShipStationConnected } from "@/lib/shipstation/service";

export default async function ShipStationDeskPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const [connected, awaiting, lastSyncedAt] = await Promise.all([
    isShipStationConnected(userId),
    listShipStationAwaiting(userId),
    getIntegrationLastSyncedAt(userId, SHIPSTATION_PROVIDER),
  ]);

  return (
    <div className="px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="group relative inline-flex items-center gap-1 text-xs uppercase tracking-[0.2em] text-accent">
            ShipStation Status
            <span className="relative inline-flex">
              <Info className="size-3.5 text-muted-foreground" aria-hidden />
              <span
                role="tooltip"
                className="pointer-events-none absolute top-full left-0 z-20 mt-1.5 hidden w-64 rounded-md border border-border bg-card px-2 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal text-foreground shadow-lg group-hover:block group-focus-within:block"
              >
                Open ShipStation orders grouped by source: WooCommerce, GunBroker, or Other
                (unknown to Chamber). Refresh syncs awaiting shipment; shipped orders drop off.
              </span>
            </span>
          </p>
        </div>
        <UpdateShipStationTrackingButton connected={connected} lastSyncedAt={lastSyncedAt} />
      </div>
      {!connected ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Connect ShipStation in{" "}
          <Link
            href="/app/settings?tab=connections#connection-shipstation"
            className="text-accent underline-offset-4 hover:underline"
          >
            Settings
          </Link>{" "}
          before refreshing.
        </p>
      ) : null}
      <ShipStationDeskView awaiting={awaiting} />
    </div>
  );
}
