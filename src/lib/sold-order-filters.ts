import type { SoldOrderCard } from "@/lib/gunbroker/orders";
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
  { id: "shipped", label: "Complete" },
  { id: "all", label: "All" },
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

/** Fully done: GunBroker notified, or ShipStation sent + shipped and GunBroker notified. */
export function isOrderShipped(order: SoldOrderCard) {
  return soldOrderPipelineStatus(order).isComplete;
}

export function matchesSoldOrderShipFilter(
  order: SoldOrderCard,
  filter: SoldOrderShipFilter,
) {
  if (filter === "all") return true;
  if (filter === "shipped") return isOrderShipped(order);
  return !isOrderShipped(order);
}
