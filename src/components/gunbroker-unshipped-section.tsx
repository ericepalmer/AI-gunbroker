"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendSoldOrderToShipStationAction } from "@/app/app/sold/actions";
import { Button } from "@/components/ui/button";
import type { SoldOrderCard } from "@/lib/gunbroker/orders";
import { formatSoldDateOnly } from "@/lib/sold-order-dates";
import { soldOrderBuyerLine, soldOrderTotalQuantity } from "@/lib/sold-order-status";

function formatMoney(value: number | null) {
  if (value == null) return null;
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function GunBrokerUnshippedSection({
  orders,
  shipStationConnected,
}: {
  orders: SoldOrderCard[];
  shipStationConnected: boolean;
}) {
  const router = useRouter();
  const [sendingOrderId, setSendingOrderId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function sendToShipStation(orderId: string) {
    if (pending || !shipStationConnected) return;
    setSendingOrderId(orderId);
    startTransition(async () => {
      const result = await sendSoldOrderToShipStationAction(orderId);
      setSendingOrderId(null);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(`Order #${orderId} sent to ShipStation.`);
      router.refresh();
    });
  }

  return (
    <section className="space-y-2">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-medium">Unshipped orders</h2>
        <p className="text-xs text-muted-foreground">{orders.length}</p>
      </div>
      {orders.length ? (
        <div className="space-y-1.5">
          {orders.map((order) => {
            const total = formatMoney(order.totalAmount);
            const qty = soldOrderTotalQuantity(order);
            const buyerLine = soldOrderBuyerLine(order);
            const inShipStation = Boolean(order.shipStationOrderId);
            const sending = sendingOrderId === order.orderId;
            return (
              <article
                key={order.id}
                className="rounded-lg border border-border bg-card px-3 py-2"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-sm font-medium" title={order.title}>
                      {order.title}
                    </h3>
                    <p className="mt-0.5 text-[11px] text-muted-foreground">
                      Order {order.orderId}
                      <span className="ml-2 opacity-80">· GunBrk</span>
                      {buyerLine ? ` · ${buyerLine}` : ""}
                      {order.orderDate ? ` · ${formatSoldDateOnly(order.orderDate)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 text-right text-[11px] leading-tight">
                    <p className="font-medium text-amber-700 dark:text-amber-400">
                      {order.orderStatusLabel || "Unshipped"}
                    </p>
                    <p className="text-muted-foreground">
                      Qty {qty}
                      {total ? ` · ${total}` : ""}
                    </p>
                    {inShipStation ? (
                      <p className="text-muted-foreground">In ShipStation</p>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="h-6 px-2 text-[10px]"
                        disabled={!shipStationConnected || sending || pending}
                        onClick={() => sendToShipStation(order.orderId)}
                      >
                        {sending ? "Sending…" : "Send to ShipStation"}
                      </Button>
                    )}
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
          No GunBroker orders waiting to ship. Sync sold orders above if this looks empty.
        </div>
      )}
    </section>
  );
}
