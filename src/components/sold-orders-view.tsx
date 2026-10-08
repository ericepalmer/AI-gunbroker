"use client";

import { useMemo, useState, useTransition, type KeyboardEvent } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { sendSoldOrderToShipStationAction } from "@/app/app/sold/actions";
import { SoldOrderInProgressStatus, SoldOrderShippedStatus } from "@/components/sold-order-card-status";
import { SoldOrderDetailDialog } from "@/components/sold-order-detail-dialog";
import { InventoryThumbnail } from "@/components/inventory-thumbnail";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SoldOrderCard } from "@/lib/gunbroker/orders";
import {
  soldOrderBuyerLine,
  soldOrderTotalQuantity,
} from "@/lib/sold-order-status";
import { soldOrderCardIsDark, soldOrderCardTheme } from "@/lib/sold-order-card-theme";
import {
  isOrderShipped,
  matchesProcessingDesk,
  matchesSoldOrderDateFilter,
  SOLD_ORDER_DATE_FILTERS,
  soldOrderSource,
  soldOrderSourceLabel,
  type SoldOrderDateFilter,
} from "@/lib/sold-order-filters";
import { cn } from "@/lib/utils";

function formatMoney(value: number | null) {
  if (value == null) return null;
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function matchesQuery(order: SoldOrderCard, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    order.orderId,
    order.title,
    order.buyerName,
    order.buyerUsername,
    order.trackingNumber,
    order.details?.buyerFullName,
    ...order.itemIds,
    ...order.items.map((item) => item.title),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
  return haystack.includes(needle);
}

function SoldOrderRow({
  order,
  sending,
  onOpen,
  onSendToShipStation,
}: {
  order: SoldOrderCard;
  sending?: boolean;
  onOpen: () => void;
  onSendToShipStation: () => void;
}) {
  const shipped = isOrderShipped(order);
  const isDark = soldOrderCardIsDark({ shipped });
  const theme = isDark ? soldOrderCardTheme.complete : soldOrderCardTheme.inProgress;
  const total = formatMoney(order.totalAmount);
  const qty = soldOrderTotalQuantity(order);
  const buyerLine = soldOrderBuyerLine(order);
  const sourceLabel = soldOrderSourceLabel(soldOrderSource(order));

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      data-sold-order={isDark ? "shipped" : "unshipped"}
      style={{
        backgroundColor: theme.background,
        color: theme.foreground,
      }}
      className={cn(
        "sold-order-row w-full cursor-pointer rounded-lg border px-2 py-1.5 text-left transition-[border-color,background-color]",
        isDark ? "border-[#2a261f]" : "border-[#b8c4d8]",
      )}
    >
      <div className="flex items-center gap-2">
        <InventoryThumbnail url={order.thumbnailUrl} size="sm" />
        <div className="min-w-0 flex-1">
          <h2
            className="truncate text-sm font-medium leading-tight"
            style={{ color: theme.foreground }}
            title={order.title}
          >
            {order.title}
          </h2>
          <div
            className="mt-0.5 flex w-full items-center gap-4 text-[11px] leading-tight"
            style={{ color: theme.foreground }}
          >
            <div className="w-24 shrink-0">
              <p>Qty: {qty}</p>
              <p>{total ? `Total: ${total}` : "Total: —"}</p>
            </div>
            <div className="min-w-0 shrink">
              <p className="truncate" title={buyerLine}>
                {buyerLine}
              </p>
              <p>
                Order: {order.orderId}
                {!shipped ? (
                  <span className="ml-2 opacity-80" title="Order source">
                    · {sourceLabel}
                  </span>
                ) : null}
              </p>
              {order.trackingNumber ? (
                <p className="truncate" title={`${order.carrier ?? ""} ${order.trackingNumber}`.trim()}>
                  Track: {order.carrier ? `${order.carrier} ` : ""}
                  {order.trackingNumber}
                </p>
              ) : null}
            </div>
            {shipped ? (
              <SoldOrderShippedStatus order={order} />
            ) : (
              <SoldOrderInProgressStatus
                order={order}
                sending={sending}
                onSend={onSendToShipStation}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function SoldOrdersView({
  orders,
  shipStationConnected,
}: {
  orders: SoldOrderCard[];
  shipStationConnected: boolean;
}) {
  const router = useRouter();
  const [dateFilter, setDateFilter] = useState<SoldOrderDateFilter>("all");
  const [query, setQuery] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [sendingOrderId, setSendingOrderId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const selectedOrder = useMemo(
    () => orders.find((order) => order.orderId === selectedOrderId) ?? null,
    [orders, selectedOrderId],
  );

  const deskOrders = useMemo(() => {
    return orders.filter(
      (order) =>
        matchesProcessingDesk(order) && matchesSoldOrderDateFilter(order.orderDate, dateFilter),
    );
  }, [orders, dateFilter]);

  const visibleOrders = useMemo(() => {
    return deskOrders.filter((order) => matchesQuery(order, query));
  }, [deskOrders, query]);

  function sendToShipStation(orderId: string) {
    if (pending) return;
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

  const emptyMessage =
    "No unshipped orders in this date range. Sync from GunBroker or widen the filter.";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {SOLD_ORDER_DATE_FILTERS.map((filter) => (
            <Button
              key={filter.id}
              type="button"
              size="sm"
              variant={dateFilter === filter.id ? "default" : "secondary"}
              className="h-7 px-2 text-xs"
              onClick={() => setDateFilter(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">
          Unshipped ({deskOrders.length})
        </span>
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Order, buyer, item"
          className="h-7 max-w-[220px] px-2 text-xs"
        />
      </div>

      {visibleOrders.length ? (
        <div className="space-y-1.5">
          {visibleOrders.map((order) => (
            <SoldOrderRow
              key={order.id}
              order={order}
              sending={sendingOrderId === order.orderId}
              onOpen={() => setSelectedOrderId(order.orderId)}
              onSendToShipStation={() => sendToShipStation(order.orderId)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-border px-4 py-10 text-center text-sm text-muted-foreground">
          {emptyMessage}
        </div>
      )}

      <SoldOrderDetailDialog
        order={selectedOrder}
        open={selectedOrder != null}
        sending={selectedOrder != null && sendingOrderId === selectedOrder.orderId}
        shipStationConnected={shipStationConnected}
        onClose={() => setSelectedOrderId(null)}
        onSendToShipStation={() =>
          selectedOrder ? sendToShipStation(selectedOrder.orderId) : undefined
        }
      />
    </div>
  );
}
