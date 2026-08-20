import { asBoolean, asEnumId, pickField } from "@/lib/gunbroker/types";

const ORDER_STATUS_LABELS: Record<number, string> = {
  0: "Not reported",
  1: "Pending seller review",
  2: "Pending buyer confirmation",
  3: "Pending payment",
  4: "Pending shipment",
  5: "Complete",
  6: "Cancelled",
  7: "Pending buyer review",
  10: "On layaway",
  11: "Payment in process",
  12: "Returned",
  13: "Refunded",
};

const ORDER_STATUS_DESCRIPTIONS: Record<number, string> = {
  0: "GunBroker did not include a status code on this order. Chamber inferred a label from other fields when possible.",
  1: "Waiting for you to review and acknowledge the sale.",
  2: "Waiting for the buyer to confirm the order.",
  3: "Waiting for GunBroker to record payment.",
  4: "Payment received — ready for you to ship.",
  5: "Order is complete on GunBroker.",
  6: "Order was cancelled.",
  7: "Waiting for the buyer to leave review.",
  10: "Buyer is paying on layaway.",
  11: "Payment is still processing.",
  12: "Order was returned.",
  13: "Order was refunded.",
};

export function resolveOrderStatus(order: unknown) {
  const direct = asEnumId(pickField(order, "orderStatus", "OrderStatus"));
  if (direct != null && direct !== 0) return direct;

  if (asBoolean(pickField(order, "orderReturned", "OrderReturned"))) return 12;
  if (asBoolean(pickField(order, "onLayaway", "OnLayaway"))) return 10;
  if (asBoolean(pickField(order, "orderComplete", "OrderComplete"))) return 5;
  if (asBoolean(pickField(order, "itemShipped", "ItemShipped"))) return 5;

  return 0;
}

export function inferOrderStatusFromFlags(input: {
  orderStatus: number;
  orderComplete: boolean;
  itemShipped: boolean;
}) {
  if (input.orderStatus !== 0) return input.orderStatus;
  if (input.orderComplete || input.itemShipped) return 5;
  return 0;
}

export function orderStatusLabel(status: number | null | undefined) {
  if (status == null) return "Unknown";
  return ORDER_STATUS_LABELS[status] ?? `Status ${status}`;
}

export function orderStatusDescription(status: number | null | undefined) {
  if (status == null) return ORDER_STATUS_DESCRIPTIONS[0]!;
  return ORDER_STATUS_DESCRIPTIONS[status] ?? "GunBroker order status.";
}

export function defaultWorkStatus(input: { orderStatus: number }) {
  // Local ship queue defaults to unshipped; terminal GB statuses need no action.
  if ([6, 12, 13].includes(input.orderStatus)) return "complete" as const;
  return "pending" as const;
}

/** GunBroker has recorded shipment/complete so the buyer is considered notified. */
export function gunBrokerBuyerNotified(input: {
  orderComplete: boolean;
  orderStatus: number;
}) {
  return input.orderComplete || input.orderStatus === 5;
}

export function orderStatusTone(status: number): "default" | "accent" | "success" | "warning" | "danger" {
  if (status === 5) return "success";
  if (status === 4) return "warning";
  if (status === 6 || status === 12 || status === 13) return "danger";
  if (status === 3 || status === 11) return "accent";
  return "default";
}
