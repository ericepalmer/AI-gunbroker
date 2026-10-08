import type { ReactNode } from "react";
import Link from "next/link";
import { ImportInventoryButton } from "@/components/import-inventory-button";
import { ImportStoreButton } from "@/components/import-store-button";
import { UpdateShipStationButton } from "@/components/update-shipstation-button";
import { listLocalSoldOrders } from "@/lib/gunbroker/orders";
import { isGunBrokerConnected } from "@/lib/gunbroker/service";
import { getIntegrationLastSyncedAt } from "@/lib/integration-sync";
import {
  GUNBROKER_INVENTORY_PATH,
  WOOCOMMERCE_INVENTORY_PATH,
  wooProductDetailPath,
} from "@/lib/inventory-paths";
import { getSession } from "@/lib/session";
import { listShipStationAwaiting } from "@/lib/shipstation/desk";
import { SHIPSTATION_PROVIDER } from "@/lib/shipstation/config";
import { isShipStationConnected } from "@/lib/shipstation/service";
import {
  isGunBrokerUnshippedOrder,
  soldOrderSourceLabel,
} from "@/lib/sold-order-filters";
import {
  isWooCommerceConnected,
  listLocalWooProducts,
  listUnshippedWooOrders,
} from "@/lib/woocommerce/service";
import { quantityMismatch } from "@/lib/woocommerce/types";
import { prisma } from "@/lib/prisma";
import type { SoldOrderSource } from "@/lib/gunbroker/orders";

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

type DashboardIssue = {
  id: string;
  href: string;
  title: string;
  detail: string;
};

function ServiceSyncCard({
  title,
  href,
  button,
  stats,
  issues,
  emptyLabel,
}: {
  title: string;
  href: string;
  button: ReactNode;
  stats: { label: string; value: number }[];
  issues: DashboardIssue[];
  emptyLabel: string;
}) {
  return (
    <div className="flex h-full flex-col rounded-lg border border-border bg-card p-3">
      <div className="flex items-baseline justify-between gap-2">
        <Link
          href={href}
          className="text-xs font-medium uppercase tracking-[0.15em] text-accent hover:underline"
        >
          {title}
        </Link>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {issues.length}
        </span>
      </div>
      <div className="mt-2 flex justify-center">{button}</div>

      <div className="mt-3 min-h-0 flex-1">
        {issues.length ? (
          <ul className="space-y-1.5">
            {issues.map((issue) => (
              <li key={issue.id}>
                <Link
                  href={issue.href}
                  className="block rounded-md border border-border/70 bg-background/60 px-2 py-1.5 transition-colors hover:border-accent/40"
                >
                  <p className="truncate text-xs font-medium text-foreground" title={issue.title}>
                    {issue.title}
                  </p>
                  <p className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {issue.detail}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-[11px] leading-snug text-muted-foreground">{emptyLabel}</p>
        )}
      </div>

      <dl className="mt-auto space-y-1 border-t border-border pt-2.5 text-xs">
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
    awaitingShip,
    wooUnshipped,
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
    listShipStationAwaiting(userId),
    listUnshippedWooOrders(userId),
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

  const gunBrokerLastSynced = listingImportedAt;
  const wooLastSynced = wooImportedAt;

  const gbLinked = linkedListingIds.length;
  const gbTotal = listingTotal;
  const wcLinked = products.filter((product) => Boolean(product.linkedListing)).length;
  const wcTotal = products.length;
  const soldLast90 = orders.filter((order) => soldInLastDays(order.orderDate, 90)).length;

  const qtyMismatches = products.filter(quantityMismatch);
  const gbUnshipped = orders.filter(isGunBrokerUnshippedOrder);

  const gbIssues: DashboardIssue[] = [
    ...(!gunBrokerConnected
      ? [
          {
            id: "gb-connect",
            href: "/app/settings?tab=connections#connection-gunbroker",
            title: "GunBroker not connected",
            detail: "Connect in Settings to sync listings and sold orders.",
          },
        ]
      : []),
    ...gbUnshipped.map((order) => ({
      id: `gb-unshipped-${order.orderId}`,
      href: GUNBROKER_INVENTORY_PATH,
      title: order.title,
      detail: `Unshipped · Order ${order.orderId}`,
    })),
    ...qtyMismatches.map((product) => ({
      id: `gb-mismatch-${product.productId}`,
      href: product.linkedListing
        ? `/app/inventory/${product.linkedListing.itemId}`
        : GUNBROKER_INVENTORY_PATH,
      title: product.linkedListing?.title || product.name,
      detail: `Qty mismatch · GB ${product.linkedListing?.quantity ?? "—"} / WC ${product.stockQuantity ?? "—"}`,
    })),
  ];

  const wcIssues: DashboardIssue[] = [
    ...(!wooConnected
      ? [
          {
            id: "wc-connect",
            href: "/app/settings?tab=connections#connection-woocommerce",
            title: "WooCommerce not connected",
            detail: "Connect in Settings to sync store products and orders.",
          },
        ]
      : wooUnshipped.error
        ? [
            {
              id: "wc-orders-error",
              href: WOOCOMMERCE_INVENTORY_PATH,
              title: "Could not load WC orders",
              detail: wooUnshipped.error,
            },
          ]
        : []),
    ...wooUnshipped.orders.map((order) => {
      const itemLine = order.lineItems
        .map((item) => `${item.quantity}× ${item.name}`)
        .join(" · ");
      return {
        id: `wc-unshipped-${order.orderId}`,
        href: WOOCOMMERCE_INVENTORY_PATH,
        title: itemLine || `Order ${order.orderNumber}`,
        detail: `Unshipped · Order ${order.orderNumber} · ${order.status}`,
      };
    }),
    ...qtyMismatches.map((product) => ({
      id: `wc-mismatch-${product.productId}`,
      href: wooProductDetailPath(product.productId),
      title: product.name,
      detail: `Qty mismatch · WC ${product.stockQuantity ?? "—"} / GB ${product.linkedListing?.quantity ?? "—"}`,
    })),
  ];

  const ssIssues: DashboardIssue[] = [
    ...(!shipStationConnected
      ? [
          {
            id: "ss-connect",
            href: "/app/settings?tab=connections#connection-shipstation",
            title: "ShipStation not connected",
            detail: "Connect in Settings before refreshing open orders.",
          },
        ]
      : []),
    ...awaitingShip.map((row) => ({
      id: `ss-awaiting-${row.orderId}`,
      href: "/app/shipstation",
      title: row.title || `Order ${row.orderId}`,
      detail: `Needs to ship · ${soldOrderSourceLabel(row.source as SoldOrderSource)} · Order ${row.orderId}`,
    })),
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-8">
      <p className="text-xs uppercase tracking-[0.2em] text-accent">Dashboard</p>
      <h1 className="mt-1.5 text-2xl font-semibold tracking-tight">Welcome, {firstName}.</h1>
      <p className="mt-1.5 max-w-xl text-sm text-muted-foreground">
        Issues to clear for each connection. Sync controls and counts sit under the longest list.
      </p>

      <div className="mt-6 grid items-stretch gap-3 sm:grid-cols-3">
        <ServiceSyncCard
          title="GunBroker"
          href={GUNBROKER_INVENTORY_PATH}
          emptyLabel="No GunBroker issues. Unshipped orders and qty mismatches show here."
          issues={gbIssues}
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
          title="WooCommerce"
          href={WOOCOMMERCE_INVENTORY_PATH}
          emptyLabel="No WooCommerce issues. Unshipped orders and qty mismatches show here."
          issues={wcIssues}
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
          title="ShipStation"
          href="/app/shipstation"
          emptyLabel="No open ShipStation orders waiting to ship."
          issues={ssIssues}
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
    </div>
  );
}
