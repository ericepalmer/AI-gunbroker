"use client";

import Link from "next/link";
import { ExternalLink } from "lucide-react";
import { WooInventoryGrid } from "@/components/woo-inventory-grid";
import { buttonVariants } from "@/components/ui/button";
import { formatSoldDateOnly } from "@/lib/sold-order-dates";
import { wooProductDetailPath } from "@/lib/inventory-paths";
import { SHIPSTATION_APP_ORDERS_URL } from "@/lib/shipstation/config";
import type { WooProductCard, WooUnshippedOrder } from "@/lib/woocommerce/types";
import { quantityMismatch } from "@/lib/woocommerce/types";
import { cn } from "@/lib/utils";

function formatMoney(value: number | null) {
  if (value == null) return null;
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function statusLabel(status: string) {
  if (!status) return "Open";
  return status
    .split(/[-_]/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function UnshippedSection({
  orders,
  error,
}: {
  orders: WooUnshippedOrder[];
  error: string | null;
}) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-medium">Unshipped orders</h2>
          <p className="text-xs text-muted-foreground">{orders.length}</p>
        </div>
        {orders.length > 0 ? (
          <a
            href={SHIPSTATION_APP_ORDERS_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              buttonVariants({ variant: "default", size: "sm" }),
              "h-7 gap-1.5 px-2.5 text-xs",
            )}
          >
            Open ShipStation
            <ExternalLink className="size-3 opacity-80" aria-hidden />
          </a>
        ) : null}
      </div>
      {error ? (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Could not load WooCommerce orders: {error}
        </div>
      ) : orders.length ? (
        <div className="space-y-1.5">
          {orders.map((order) => {
            const itemLine = order.lineItems
              .map((item) => `${item.quantity}× ${item.name}`)
              .join(" · ");
            const total = formatMoney(order.total);
            return (
              <article
                key={order.orderId}
                className="rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium" title={itemLine || undefined}>
                      {itemLine || `Order ${order.orderNumber}`}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Order {order.orderNumber}
                      {order.customerName ? ` · ${order.customerName}` : ""}
                      {order.dateCreated
                        ? ` · ${formatSoldDateOnly(order.dateCreated)}`
                        : ""}
                    </p>
                  </div>
                  <div className="text-right text-[11px] leading-tight">
                    <p className="font-medium text-amber-700 dark:text-amber-400">
                      {statusLabel(order.status)}
                    </p>
                    {total ? <p className="text-muted-foreground">{total}</p> : null}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No open WooCommerce orders. Pending, processing, and on-hold orders appear here.
        </div>
      )}
    </section>
  );
}

function MismatchSection({ products }: { products: WooProductCard[] }) {
  const mismatches = products.filter(quantityMismatch);

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
                      <Link
                        href={wooProductDetailPath(product.productId)}
                        className="hover:underline"
                      >
                        {product.name}
                      </Link>
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      {product.sku ? `SKU ${product.sku} · ` : ""}
                      {product.linkedListing ? (
                        <Link
                          href={`/app/inventory/${product.linkedListing.itemId}`}
                          className="text-accent underline-offset-4 hover:underline"
                        >
                          GB #{product.linkedListing.itemId}
                        </Link>
                      ) : (
                        "Linked listing missing"
                      )}
                    </p>
                  </div>
                  <div className="text-right text-[11px] leading-tight tabular-nums">
                    <p>
                      <span className="text-muted-foreground">WC </span>
                      <span className="font-medium">{wooQty ?? "—"}</span>
                    </p>
                    <p>
                      <span className="text-muted-foreground">GB </span>
                      <span className="font-medium text-amber-700 dark:text-amber-400">
                        {gbQty ?? "—"}
                      </span>
                    </p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          Linked products match GunBroker quantities.
        </div>
      )}
    </section>
  );
}

export function WooCommerceStatusView({
  products,
  unshippedOrders,
  unshippedError,
}: {
  products: WooProductCard[];
  unshippedOrders: WooUnshippedOrder[];
  unshippedError: string | null;
}) {
  return (
    <div className="mt-4 space-y-8">
      <UnshippedSection orders={unshippedOrders} error={unshippedError} />
      <MismatchSection products={products} />
      <section className="space-y-2">
        <h2 className="text-sm font-medium">Inventory</h2>
        <WooInventoryGrid products={products} />
      </section>
    </div>
  );
}
