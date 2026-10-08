"use client";

import Link from "next/link";
import type { InventoryTabItem } from "@/components/inventory-grid";
import { GunBrokerInventoryView } from "@/components/gunbroker-inventory-view";
import { GunBrokerUnshippedSection } from "@/components/gunbroker-unshipped-section";
import type { SoldOrderCard } from "@/lib/gunbroker/orders";
import { wooProductDetailPath } from "@/lib/inventory-paths";
import type { WooProductCard } from "@/lib/woocommerce/types";
import { quantityMismatch } from "@/lib/woocommerce/types";

function MismatchSection({ products }: { products: WooProductCard[] }) {
  const mismatches = products.filter(
    (product) => product.linkedListing != null && quantityMismatch(product),
  );

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">Quantity mismatches</h2>
        <p className="text-xs text-muted-foreground">{mismatches.length}</p>
      </div>
      {mismatches.length ? (
        <div className="space-y-1.5">
          {mismatches.map((product) => {
            const wooQty = product.stockQuantity;
            const gbQty = product.linkedListing?.quantity;
            return (
              <article
                key={product.productId}
                className="rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium">
                      {product.linkedListing ? (
                        <Link
                          href={`/app/inventory/${product.linkedListing.itemId}`}
                          className="hover:underline"
                        >
                          {product.linkedListing.title || product.name}
                        </Link>
                      ) : (
                        product.name
                      )}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {product.linkedListing ? (
                        <>
                          GB #{product.linkedListing.itemId}
                          {" · "}
                        </>
                      ) : null}
                      <Link
                        href={wooProductDetailPath(product.productId)}
                        className="text-accent underline-offset-4 hover:underline"
                      >
                        WC {product.sku ? `SKU ${product.sku}` : `#${product.productId}`}
                      </Link>
                    </p>
                  </div>
                  <div className="text-right text-[11px] leading-tight tabular-nums">
                    <p>
                      <span className="text-muted-foreground">GB </span>
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {gbQty ?? "—"}
                      </span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">WC </span>
                      <span className="font-medium">{wooQty ?? "—"}</span>
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Linked GunBroker listings match WooCommerce quantities.
        </div>
      )}
    </section>
  );
}

export function GunBrokerStatusView({
  items,
  products,
  unshippedOrders,
  shipStationConnected,
  emptyMessage,
}: {
  items: InventoryTabItem[];
  products: WooProductCard[];
  unshippedOrders: SoldOrderCard[];
  shipStationConnected: boolean;
  emptyMessage: string;
}) {
  return (
    <div className="mt-4 space-y-8">
      <GunBrokerUnshippedSection
        orders={unshippedOrders}
        shipStationConnected={shipStationConnected}
      />
      <MismatchSection products={products} />
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Inventory</h2>
        <GunBrokerInventoryView items={items} emptyMessage={emptyMessage} />
      </section>
    </div>
  );
}
