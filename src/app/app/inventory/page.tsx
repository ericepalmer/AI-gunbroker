import { ImportInventoryButton } from "@/components/import-inventory-button";
import { InventoryGrid } from "@/components/inventory-grid";
import { listLocalInventory } from "@/lib/gunbroker/listings";
import { isGunBrokerConnected } from "@/lib/gunbroker/service";
import { getSession } from "@/lib/session";
import Link from "next/link";

export default async function InventoryPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const [connected, listings] = await Promise.all([
    isGunBrokerConnected(userId),
    listLocalInventory(userId),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="text-sm uppercase tracking-[0.2em] text-accent">Inventory</p>
        <ImportInventoryButton connected={connected} />
      </div>
      {!connected ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Connect GunBroker in{" "}
          <Link href="/app/settings?tab=connections" className="text-accent underline-offset-4 hover:underline">
            Settings
          </Link>{" "}
          before importing.
        </p>
      ) : null}
      <div className="mt-8">
        <InventoryGrid listings={listings} />
      </div>
    </div>
  );
}
