import { ImportInventoryButton } from "@/components/import-inventory-button";
import { GunBrokerInventoryView } from "@/components/gunbroker-inventory-view";
import { gunBrokerTabItems } from "@/components/inventory-grid";
import { listLocalInventory } from "@/lib/gunbroker/listings";
import { isGunBrokerConnected } from "@/lib/gunbroker/service";
import { getSession } from "@/lib/session";
import { listLocalWooProducts } from "@/lib/woocommerce/service";
import Link from "next/link";

export default async function GunBrokerInventoryPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const [connected, listings, products] = await Promise.all([
    isGunBrokerConnected(userId),
    listLocalInventory(userId),
    listLocalWooProducts(userId),
  ]);

  return (
    <div className="px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">GunBroker inventory</p>
        <ImportInventoryButton connected={connected} />
      </div>
      {!connected ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Connect GunBroker in{" "}
          <Link href="/app/settings?tab=connections" className="text-accent underline-offset-4 hover:underline">
            Settings
          </Link>{" "}
          before importing. WooCommerce items marked as a source still appear here.
        </p>
      ) : null}
      <div className="mt-4">
        <GunBrokerInventoryView
          items={gunBrokerTabItems(listings, products)}
          emptyMessage="No listings yet. Import from GunBroker, or mark WooCommerce items as a GunBroker source."
        />
      </div>
    </div>
  );
}
