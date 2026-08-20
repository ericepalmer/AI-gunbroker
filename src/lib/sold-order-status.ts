import type { SoldOrderCard } from "@/lib/gunbroker/orders";

export type SoldOrderStepState = "done" | "pending";

export type SoldOrderPipelineStatus = {
  shipStationSent: SoldOrderStepState;
  shipStationShipped: SoldOrderStepState;
  gunBrokerNotified: SoldOrderStepState;
  isComplete: boolean;
};

export function soldOrderPipelineStatus(order: SoldOrderCard): SoldOrderPipelineStatus {
  const gunBrokerNotified = order.gunBrokerNotified
    ? ("done" as const)
    : ("pending" as const);
  // If GunBroker already marked the sale complete, treat ShipStation as done too.
  const shipStationSent =
    gunBrokerNotified === "done" || order.shipStationOrderId
      ? ("done" as const)
      : ("pending" as const);
  const shipStationShipped =
    gunBrokerNotified === "done" ||
    order.shipStationStatus === "shipped" ||
    Boolean(order.trackingNumber)
      ? ("done" as const)
      : ("pending" as const);

  return {
    shipStationSent,
    shipStationShipped,
    gunBrokerNotified,
    isComplete:
      shipStationSent === "done" &&
      shipStationShipped === "done" &&
      gunBrokerNotified === "done",
  };
}

export function soldOrderTotalQuantity(order: SoldOrderCard) {
  const fromItems = order.items.reduce((sum, item) => sum + item.quantity, 0);
  return fromItems > 0 ? fromItems : order.itemCount;
}

export function soldOrderBuyerLine(order: SoldOrderCard) {
  const username = order.details?.buyerUsername ?? order.buyerUsername;
  const candidates = [
    order.details?.shipTo?.name,
    order.shipTo?.name,
    order.details?.buyerFullName,
    order.buyerName,
  ];
  const name =
    candidates
      .map((value) => value?.trim())
      .find((value) => value && value !== username) ?? "Unknown buyer";
  const state = order.details?.shipTo?.state ?? order.shipTo?.state;
  return state ? `${name}, ${state}` : name;
}
