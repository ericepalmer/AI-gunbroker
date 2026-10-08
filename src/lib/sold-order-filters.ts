import type { SoldOrderCard, SoldOrderSource } from "@/lib/gunbroker/orders";
import { soldOrderPipelineStatus } from "@/lib/sold-order-status";

export type SoldOrderDateFilter = "today" | "yesterday" | "week" | "month" | "all";
export type SoldOrderShipFilter = "unshipped" | "shipped" | "all";

export const SOLD_ORDER_DATE_FILTERS: { id: SoldOrderDateFilter; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yesterday" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "all", label: "All" },
];

export const SOLD_ORDER_SHIP_FILTERS: { id: SoldOrderShipFilter; label: string }[] = [
  { id: "unshipped", label: "In Progress" },
];

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function matchesSoldOrderDateFilter(
  orderDateIso: string | null,
  filter: SoldOrderDateFilter,
) {
  if (filter === "all") return true;
  if (!orderDateIso) return false;

  const orderDay = startOfLocalDay(new Date(orderDateIso));
  const today = startOfLocalDay(new Date());

  if (filter === "today") {
    return orderDay.getTime() === today.getTime();
  }

  if (filter === "yesterday") {
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    return orderDay.getTime() === yesterday.getTime();
  }

  if (filter === "week") {
    const weekStart = new Date(today);
    weekStart.setDate(weekStart.getDate() - weekStart.getDay());
    return orderDay >= weekStart;
  }

  if (filter === "month") {
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    return orderDay >= monthStart;
  }

  return true;
}

/** Fully done: GunBroker notified after ShipStation send + ship. */
export function isOrderShipped(order: SoldOrderCard) {
  return soldOrderPipelineStatus(order).isComplete;
}

/** True when a shipment already left — those belong on ShipStation Status, not Processing. */
export function hasShippedFromProcessing(order: SoldOrderCard) {
  if (order.itemShipped) return true;
  if (order.shipStationStatus === "shipped") return true;
  if (order.trackingNumber?.trim()) return true;
  if (order.shippedDate || order.details?.shippedDate) return true;
  return false;
}

/** True when this sold order came from GunBroker (vs ShipStation-only sync). */
export function isGunBrokerSoldOrder(order: SoldOrderCard) {
  return Boolean(
    order.gunBrokerNotified ||
      order.buyerUsername ||
      order.details?.buyerUserId ||
      order.details?.buyerUsername ||
      order.itemIds.length > 0 ||
      order.details?.source === "gunbroker",
  );
}

/** GunBroker still treats the sale as not shipped / not complete. */
export function isGunBrokerUnshippedOrder(order: SoldOrderCard) {
  if (!isGunBrokerSoldOrder(order)) return false;
  if (order.itemShipped || order.gunBrokerNotified) return false;
  if (order.orderStatus === 5) return false;
  return soldOrderSource(order) === "gunbroker";
}

export function soldOrderSource(order: SoldOrderCard): SoldOrderSource {
  const explicit = order.details?.source;
  if (explicit === "gunbroker" || explicit === "woocommerce" || explicit === "other") {
    return explicit;
  }
  if (isGunBrokerSoldOrder(order)) return "gunbroker";
  return "other";
}

export function soldOrderSourceLabel(source: SoldOrderSource) {
  switch (source) {
    case "gunbroker":
      return "GunBrk";
    case "woocommerce":
      return "WooComm";
    default:
      return "Other";
  }
}

/** Infer channel from ShipStation advancedOptions.source / store name. */
export function sourceFromShipStationBlob(source: string | null | undefined): SoldOrderSource {
  const blob = (source ?? "").toLowerCase();
  if (!blob) return "other";
  if (/gun\s*brk|gunbroker|gun.?broker/.test(blob)) return "gunbroker";
  if (/woo|woocommerce|wordpress/.test(blob)) return "woocommerce";
  return "other";
}

/**
 * Processing desk: only unshipped work. Shipped orders live on ShipStation Status.
 */
export function matchesProcessingDesk(order: SoldOrderCard) {
  return !hasShippedFromProcessing(order);
}

export function matchesSoldOrderShipFilter(
  order: SoldOrderCard,
  filter: SoldOrderShipFilter,
) {
  if (filter === "all") return true;
  if (filter === "shipped") return isOrderShipped(order);
  return !hasShippedFromProcessing(order);
}
