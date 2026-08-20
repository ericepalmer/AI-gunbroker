"use client";

import { useEffect } from "react";
import { SoldOrderCardStatusPanel } from "@/components/sold-order-card-status";
import { InventoryThumbnail } from "@/components/inventory-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { orderStatusDescription, orderStatusTone } from "@/lib/gunbroker/order-status";
import type { SoldOrderCard, SoldOrderShipTo } from "@/lib/gunbroker/orders";
import { formatSoldAndShippedDates, formatSoldDateOnly } from "@/lib/sold-order-dates";
import { soldOrderCardIsDark } from "@/lib/sold-order-card-theme";
import { isOrderShipped } from "@/lib/sold-order-filters";

function formatDate(value: string | null) {
  return formatSoldDateOnly(value);
}

function formatMoney(value: number | null | undefined) {
  if (value == null) return "—";
  return value.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

function formatAddress(shipTo: SoldOrderShipTo | null) {
  if (!shipTo) return null;
  const lines = [
    shipTo.name,
    shipTo.company,
    shipTo.street1,
    shipTo.street2,
    [shipTo.city, shipTo.state, shipTo.postalCode].filter(Boolean).join(", "),
    shipTo.country,
    shipTo.phone ? `Phone ${shipTo.phone}` : null,
  ].filter(Boolean);
  return lines.length ? lines : null;
}


export function SoldOrderDetailDialog({
  order,
  open,
  sending,
  shipStationConnected,
  onClose,
  onSendToShipStation,
}: {
  order: SoldOrderCard | null;
  open: boolean;
  sending?: boolean;
  shipStationConnected: boolean;
  onClose: () => void;
  onSendToShipStation: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !sending) onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, sending, onClose]);

  if (!open || !order) return null;

  const details = order.details;
  const addressLines = formatAddress(details?.shipTo ?? order.shipTo);
  const shipped = isOrderShipped(order);
  const isDark = soldOrderCardIsDark({ shipped });

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close order details"
        className="absolute inset-0 bg-black/60"
        disabled={sending}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sold-order-detail-title"
        className="relative max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-border bg-card p-5 shadow-xl"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-accent">Order details</p>
            <h2 id="sold-order-detail-title" className="mt-1 text-xl font-medium">
              Order #{details?.orderNumber ?? order.orderId}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {shipped
                ? formatSoldAndShippedDates(order.orderDate, order.shippedDate)
                : `Sold ${formatDate(order.orderDate)}`}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge tone={orderStatusTone(order.orderStatus)}>{order.orderStatusLabel}</Badge>
            {shipped ? (
              <Badge tone="success">Shipped</Badge>
            ) : (
              <Badge tone="warning">Unshipped</Badge>
            )}
          </div>
        </div>
        <p className="mt-2 text-xs text-muted-foreground">
          {orderStatusDescription(order.orderStatus)}
        </p>

        <div className="mt-5 grid gap-5 md:grid-cols-2">
          <section>
            <h3 className="text-sm font-medium">Buyer</h3>
            <p className="mt-2 text-sm">
              {details?.buyerFullName ?? order.buyerName ?? "Unknown buyer"}
            </p>
            {details?.buyerUsername || order.buyerUsername ? (
              <p className="mt-1 text-sm text-muted-foreground">
                User ID {details?.buyerUsername ?? order.buyerUsername}
              </p>
            ) : null}
            {details?.buyerUserId &&
            details.buyerUserId !== (details?.buyerUsername ?? order.buyerUsername) ? (
              <p className="mt-1 text-sm text-muted-foreground">Account #{details.buyerUserId}</p>
            ) : null}
          </section>

          <section>
            <h3 className="text-sm font-medium">Ship to</h3>
            {addressLines ? (
              <div className="mt-2 space-y-0.5 text-sm text-muted-foreground">
                {addressLines.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            ) : (
              <p className="mt-2 text-sm text-muted-foreground">Address not available yet.</p>
            )}
            {details?.buyerEmail ? (
              <p className="mt-2 text-sm">
                <span className="text-muted-foreground">Email </span>
                <a
                  href={`mailto:${details.buyerEmail}`}
                  className="text-accent underline-offset-4 hover:underline"
                >
                  {details.buyerEmail}
                </a>
              </p>
            ) : null}
          </section>
        </div>

        <section className="mt-5">
          <h3 className="text-sm font-medium">Shipping</h3>
          <dl className="mt-2 grid gap-x-8 gap-y-1 text-sm sm:grid-cols-2">
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted-foreground">Type</dt>
              <dd>{details?.shippingType ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4 sm:block">
              <dt className="text-muted-foreground">Cost</dt>
              <dd className="tabular-nums">{formatMoney(details?.shippingCost)}</dd>
            </div>
          </dl>
        </section>

        <section className="mt-5 rounded-xl border border-border bg-muted/20 p-4">
          <h3 className="text-sm font-medium">Shipment progress</h3>
          <dl className="mt-3 space-y-1 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="shrink-0 text-muted-foreground">Tracking number</dt>
              <dd className="break-all text-right font-mono text-sm">
                {order.trackingNumber ?? order.details?.trackingNumber ?? "—"}
              </dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Carrier</dt>
              <dd>{order.carrier ?? order.details?.carrier ?? "—"}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Ship date</dt>
              <dd>
                {order.shippedDate
                  ? formatDate(order.shippedDate)
                  : order.details?.shippedDate
                    ? formatDate(order.details.shippedDate)
                    : "—"}
              </dd>
            </div>
          </dl>
          <div className="mt-3">
            <SoldOrderCardStatusPanel
              order={order}
              isDark={isDark}
              sending={sending}
              onSend={onSendToShipStation}
            />
          </div>
          {!shipStationConnected ? (
            <p className="mt-2 text-sm text-muted-foreground">
              Connect ShipStation in Settings to send orders and check shipment status.
            </p>
          ) : (
            <p className="mt-2 text-xs text-muted-foreground">
              Use Send on the card to create the ShipStation order. Update ShipStation on the Sold
              page to pull shipped status. Complete requires ShipStation shipped and GunBroker
              notified.
            </p>
          )}
        </section>

        <section className="mt-5">
          <h3 className="text-sm font-medium">Items purchased</h3>
          <ul className="mt-2 divide-y divide-border rounded-xl border border-border">
            {(details?.items ?? order.items).map((item) => (
              <li key={item.itemId} className="flex items-start gap-3 p-3 text-sm">
                <InventoryThumbnail url={item.thumbnailUrl} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.title}</p>
                  <p className="text-muted-foreground">
                    Item #{item.itemId}
                    {item.sku ? ` · SKU ${item.sku}` : ""}
                    {item.quantity > 1 ? ` · Qty ${item.quantity}` : ""}
                  </p>
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  <p>{formatMoney(item.subtotal ?? item.price)}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <section className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
          <h3 className="text-sm font-medium">Totals</h3>
          <dl className="mt-3 space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Items</dt>
              <dd className="tabular-nums">{formatMoney(details?.subtotal)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Shipping</dt>
              <dd className="tabular-nums">{formatMoney(details?.shippingCost)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Taxes / fees</dt>
              <dd className="tabular-nums">{formatMoney(details?.taxesAndFees)}</dd>
            </div>
            {details?.complianceFee != null ? (
              <p className="text-xs text-muted-foreground">
                Includes {formatMoney(details.complianceFee)} GunBroker compliance fee
              </p>
            ) : null}
            <div className="flex justify-between gap-4 border-t border-border pt-2 text-base font-medium">
              <dt>Total</dt>
              <dd className="tabular-nums">{formatMoney(details?.total ?? order.totalAmount)}</dd>
            </div>
          </dl>
        </section>

        <div className="mt-5 flex justify-end">
          <Button type="button" variant="secondary" onClick={onClose} disabled={sending}>
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
