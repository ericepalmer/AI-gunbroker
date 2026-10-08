"use client";

import { useMemo, type ReactNode } from "react";
import { ExternalLink } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { SHIPSTATION_APP_ORDERS_URL } from "@/lib/shipstation/config";
import type { ShipStationDeskRow, ShipStationDeskSource } from "@/lib/shipstation/types";
import { formatSoldDateOnly } from "@/lib/sold-order-dates";
import { cn } from "@/lib/utils";

function DeskSection({
  title,
  empty,
  rows,
  action,
}: {
  title: string;
  empty: string;
  rows: ShipStationDeskRow[];
  action?: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-sm font-medium">{title}</h2>
          <p className="text-xs text-muted-foreground">{rows.length}</p>
        </div>
        {action}
      </div>
      {rows.length ? (
        <div className="space-y-1.5">
          {rows.map((row) => (
            <article
              key={`${title}-${row.orderId}`}
              className="rounded-lg border border-border bg-card px-3 py-2"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h3 className="truncate text-sm font-medium" title={row.title ?? undefined}>
                    {row.title || `Order ${row.orderId}`}
                  </h3>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    Order {row.orderId}
                    {row.buyerName ? ` · ${row.buyerName}` : ""}
                    {row.orderDate ? ` · Sold ${formatSoldDateOnly(row.orderDate)}` : ""}
                  </p>
                </div>
                <div className="text-right text-[11px] leading-tight">
                  <p className="font-medium text-amber-700 dark:text-amber-400">
                    {row.deliveryStatusLabel ?? "Awaiting shipment"}
                  </p>
                  {row.shipByDate ? (
                    <p className="text-muted-foreground">
                      Ship by {formatSoldDateOnly(row.shipByDate)}
                    </p>
                  ) : null}
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          {empty}
        </div>
      )}
    </section>
  );
}

function bySource(rows: ShipStationDeskRow[], source: ShipStationDeskSource) {
  return rows.filter((row) => row.source === source);
}

export function ShipStationDeskView({ awaiting }: { awaiting: ShipStationDeskRow[] }) {
  const wooRows = useMemo(() => bySource(awaiting, "woocommerce"), [awaiting]);
  const gbRows = useMemo(() => bySource(awaiting, "gunbroker"), [awaiting]);
  const otherRows = useMemo(() => bySource(awaiting, "other"), [awaiting]);

  return (
    <div className="mt-4 space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">
          Needs to ship ({awaiting.length})
        </p>
        {awaiting.length > 0 ? (
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
      <DeskSection
        title="WooCommerce"
        empty="No WooCommerce orders waiting to ship in ShipStation."
        rows={wooRows}
        action={
          wooRows.length > 0 ? (
            <a
              href={SHIPSTATION_APP_ORDERS_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                buttonVariants({ variant: "secondary", size: "sm" }),
                "h-7 gap-1.5 px-2.5 text-xs",
              )}
            >
              Open ShipStation
              <ExternalLink className="size-3 opacity-70" aria-hidden />
            </a>
          ) : null
        }
      />
      <DeskSection
        title="GunBroker"
        empty="No GunBroker orders waiting to ship in ShipStation."
        rows={gbRows}
      />
      <DeskSection
        title="Other"
        empty="No other orders waiting to ship in ShipStation."
        rows={otherRows}
      />
    </div>
  );
}
