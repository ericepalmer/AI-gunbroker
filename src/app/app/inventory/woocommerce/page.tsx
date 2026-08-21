import { ImportStoreButton } from "@/components/import-store-button";
import { WooInventoryGrid } from "@/components/woo-inventory-grid";
import { getSession } from "@/lib/session";
import { isWooCommerceConnected, listLocalWooProducts } from "@/lib/woocommerce/service";
import Link from "next/link";

export default async function WooCommerceInventoryPage() {
  const session = await getSession();
  const userId = session!.user.id;
  const [connected, products] = await Promise.all([
    isWooCommerceConnected(userId),
    listLocalWooProducts(userId),
  ]);
  const lastSyncedAt =
    products.reduce<string | null>((latest, product) => {
      if (!product.lastImportedAt) return latest;
      if (!latest || product.lastImportedAt > latest) return product.lastImportedAt;
      return latest;
    }, null) ?? null;

  return (
    <div className="px-4 py-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs uppercase tracking-[0.2em] text-accent">WooCommerce inventory</p>
        <ImportStoreButton connected={connected} lastSyncedAt={lastSyncedAt} />
      </div>
      {!connected ? (
        <p className="mt-4 text-xs text-muted-foreground">
          Connect WooCommerce in{" "}
          <Link href="/app/settings?tab=connections" className="text-accent underline-offset-4 hover:underline">
            Settings
          </Link>{" "}
          before importing.
        </p>
      ) : null}
      <div className="mt-4">
        <WooInventoryGrid products={products} />
      </div>
    </div>
  );
}
