import type { SoldOrderDetails, SoldOrderLineItem, SoldOrderShipTo } from "@/lib/gunbroker/orders";
import {
  createShipStationOrder,
  getShipStationOrder,
  listShipStationOrdersByNumber,
  listShipStationShipments,
} from "@/lib/shipstation/client";
import { isShipStationConnected, withShipStationAccess } from "@/lib/shipstation/service";
import { SHIPSTATION_PROVIDER } from "@/lib/shipstation/config";
import { markIntegrationSynced } from "@/lib/integration-sync";
import type {
  ShipStationAddress,
  ShipStationCheckResult,
  ShipStationCreateOrderInput,
  ShipStationOrder,
  ShipStationShipment,
} from "@/lib/shipstation/types";
import { prisma } from "@/lib/prisma";

const CARRIER_LABELS: Record<string, string> = {
  stamps_com: "USPS",
  usps: "USPS",
  ups: "UPS",
  ups_walleted: "UPS",
  fedex: "FedEx",
  dhl_express: "DHL",
  dhl_global_mail: "DHL",
  ontrac: "OnTrac",
  lasership: "LaserShip",
};

export function shipStationOrderKey(orderId: string) {
  return `gunbroker-${orderId}`;
}

export function formatShipStationCarrier(carrierCode: string | null, serviceCode?: string | null) {
  if (!carrierCode) return null;
  const base = CARRIER_LABELS[carrierCode.toLowerCase()] ?? carrierCode.toUpperCase();
  if (!serviceCode) return base;
  return `${base} (${serviceCode})`;
}

function normalizeCountry(value: string | null | undefined) {
  const raw = (value ?? "US").trim();
  if (/^united states/i.test(raw)) return "US";
  if (raw.length === 2) return raw.toUpperCase();
  return raw.slice(0, 2).toUpperCase();
}

function toAddress(shipTo: SoldOrderShipTo): ShipStationAddress {
  const street1 = shipTo.street1?.trim();
  const city = shipTo.city?.trim();
  const state = shipTo.state?.trim();
  const postalCode = shipTo.postalCode?.trim();
  if (!street1 || !city || !state || !postalCode) {
    throw new Error("Ship-to address is incomplete. Sync the order from GunBroker again.");
  }
  return {
    name: shipTo.name?.trim() || "GunBroker buyer",
    company: shipTo.company?.trim() || null,
    street1,
    street2: shipTo.street2?.trim() || null,
    city,
    state,
    postalCode,
    country: normalizeCountry(shipTo.country),
    phone: shipTo.phone?.trim() || null,
  };
}

function parseDetailsJson(raw: string, orderId: string): SoldOrderDetails | null {
  try {
    const parsed = JSON.parse(raw) as SoldOrderDetails;
    if (parsed && typeof parsed === "object" && parsed.orderNumber) {
      return parsed;
    }
  } catch {
    // Ignore invalid JSON.
  }
  return null;
}

function parseItems(raw: string): SoldOrderLineItem[] {
  try {
    return JSON.parse(raw) as SoldOrderLineItem[];
  } catch {
    return [];
  }
}

function parseShipTo(raw: string): SoldOrderShipTo | null {
  try {
    const parsed = JSON.parse(raw) as SoldOrderShipTo;
    return Object.values(parsed).some(Boolean) ? parsed : null;
  } catch {
    return null;
  }
}

function buildCreateOrderInput(row: {
  orderId: string;
  orderDate: Date | null;
  buyerUsername: string | null;
  buyerName: string | null;
  totalAmount: number | null;
  itemsJson: string;
  shipToJson: string;
  detailsJson: string;
  shipStationOrderId: string | null;
}): ShipStationCreateOrderInput {
  const details = parseDetailsJson(row.detailsJson, row.orderId);
  const items = details?.items?.length ? details.items : parseItems(row.itemsJson);
  if (!items.length) {
    throw new Error("This order has no line items to send.");
  }

  const shipTo = details?.shipTo ?? parseShipTo(row.shipToJson);
  if (!shipTo) {
    throw new Error("Ship-to address is missing. Sync the order from GunBroker again.");
  }

  const address = toAddress(shipTo);
  const orderDate = row.orderDate ?? new Date();
  const shippingAmount = details?.shippingCost ?? 0;
  const taxAmount = details?.taxesAndFees ?? 0;
  const amountPaid = details?.total ?? row.totalAmount ?? shippingAmount + taxAmount;

  return {
    orderNumber: row.orderId,
    orderKey: shipStationOrderKey(row.orderId),
    orderDate: orderDate.toISOString(),
    customerUsername: details?.buyerUsername ?? row.buyerUsername,
    customerEmail: details?.buyerEmail ?? null,
    billTo: address,
    shipTo: address,
    items: items.map((item) => ({
      lineItemKey: item.itemId,
      sku: item.sku,
      name: item.title,
      quantity: item.quantity,
      unitPrice: item.price ?? 0,
      imageUrl: item.thumbnailUrl,
    })),
    amountPaid: amountPaid ?? 0,
    shippingAmount: shippingAmount ?? 0,
    taxAmount: taxAmount ?? 0,
    ...(row.shipStationOrderId ? { orderId: Number(row.shipStationOrderId) } : {}),
  };
}

function pickLatestShipment(shipments: ShipStationShipment[]) {
  return shipments.find((row) => row.trackingNumber) ?? shipments[0] ?? null;
}

function shipmentIsShipped(order: ShipStationOrder, shipment: ShipStationShipment | null) {
  if (order.orderStatus === "shipped") return true;
  if (shipment?.trackingNumber) return true;
  return Boolean(order.trackingNumber);
}

function shipDateFrom(order: ShipStationOrder, shipment: ShipStationShipment | null) {
  const raw = shipment?.shipDate ?? order.shipDate;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? raw : date.toISOString();
}

async function resolveShipStationOrder(
  credentials: Parameters<typeof listShipStationOrdersByNumber>[0],
  orderId: string,
  shipStationOrderId: string | null,
) {
  if (shipStationOrderId) {
    try {
      return await getShipStationOrder(credentials, Number(shipStationOrderId));
    } catch {
      // Fall through to lookup by order number.
    }
  }
  const matches = await listShipStationOrdersByNumber(credentials, orderId);
  return matches[0] ?? null;
}

async function applyShipStationShipment(
  userId: string,
  orderId: string,
  order: ShipStationOrder,
  shipment: ShipStationShipment | null,
) {
  const row = await prisma.soldOrder.findUnique({
    where: { userId_orderId: { userId, orderId } },
  });
  if (!row) {
    throw new Error("Order not found.");
  }

  const trackingNumber =
    shipment?.trackingNumber ?? order.trackingNumber ?? row.trackingNumber ?? null;
  const carrier =
    formatShipStationCarrier(
      shipment?.carrierCode ?? order.carrierCode,
      shipment?.serviceCode ?? order.serviceCode,
    ) ?? row.carrier;
  const shipDate = shipDateFrom(order, shipment);
  const shipped = shipmentIsShipped(order, shipment);
  const details = parseDetailsJson(row.detailsJson, row.orderId);
  const nextDetails = {
    ...(details ?? {
      orderNumber: row.orderId,
      buyerFullName: row.buyerName,
      buyerUsername: row.buyerUsername,
      buyerUserId: null,
      buyerEmail: null,
      shippedDate: null,
      shipTo: parseShipTo(row.shipToJson),
      items: parseItems(row.itemsJson),
      subtotal: null,
      shippingType: null,
      shippingCost: null,
      taxesAndFees: null,
      complianceFee: null,
      total: row.totalAmount,
      trackingNumber: null,
      carrier: null,
    }),
    trackingNumber: trackingNumber ?? details?.trackingNumber ?? null,
    carrier: carrier ?? details?.carrier ?? null,
    shippedDate: shipDate ?? details?.shippedDate ?? null,
  };

  await prisma.soldOrder.update({
    where: { userId_orderId: { userId, orderId } },
    data: {
      shipStationOrderId: String(order.orderId),
      shipStationStatus: order.orderStatus,
      shipStationSyncedAt: new Date(),
      trackingNumber,
      carrier,
      detailsJson: JSON.stringify(nextDetails),
      ...(shipped
        ? {
            ...(row.gunBrokerNotified && (row.shipStationOrderId || order.orderId)
              ? {
                  workStatus: "complete" as const,
                  completedAt: shipDate ? new Date(shipDate) : row.completedAt ?? new Date(),
                }
              : {
                  workStatus: "pending" as const,
                  completedAt: null,
                }),
          }
        : {}),
    },
  });

  return {
    found: true,
    orderStatus: order.orderStatus,
    trackingNumber,
    carrier,
    shipDate,
    shipStationOrderId: String(order.orderId),
    updated: shipped && Boolean(trackingNumber || shipDate),
  } satisfies ShipStationCheckResult;
}

export async function sendSoldOrderToShipStation(userId: string, orderId: string) {
  if (!(await isShipStationConnected(userId))) {
    throw new Error("Connect ShipStation in Settings before sending orders.");
  }

  const row = await prisma.soldOrder.findUnique({
    where: { userId_orderId: { userId, orderId } },
  });
  if (!row) {
    throw new Error("Order not found.");
  }

  const input = buildCreateOrderInput(row);

  const order = await withShipStationAccess(userId, (credentials) =>
    createShipStationOrder(credentials, input),
  );

  await prisma.soldOrder.update({
    where: { userId_orderId: { userId, orderId } },
    data: {
      shipStationOrderId: String(order.orderId),
      shipStationStatus: order.orderStatus,
      shipStationSyncedAt: new Date(),
    },
  });

  return {
    orderId: order.orderId,
    orderNumber: order.orderNumber,
    orderStatus: order.orderStatus,
  };
}

export async function checkSoldOrderOnShipStation(
  userId: string,
  orderId: string,
): Promise<ShipStationCheckResult> {
  if (!(await isShipStationConnected(userId))) {
    throw new Error("Connect ShipStation in Settings before checking shipment status.");
  }

  const row = await prisma.soldOrder.findUnique({
    where: { userId_orderId: { userId, orderId } },
  });
  if (!row) {
    throw new Error("Order not found.");
  }

  return withShipStationAccess(userId, async (credentials) => {
    const order = await resolveShipStationOrder(
      credentials,
      orderId,
      row.shipStationOrderId,
    );
    if (!order) {
      await prisma.soldOrder.update({
        where: { userId_orderId: { userId, orderId } },
        data: { shipStationSyncedAt: new Date() },
      });
      return {
        found: false,
        orderStatus: null,
        trackingNumber: null,
        carrier: null,
        shipDate: null,
        shipStationOrderId: null,
        updated: false,
      };
    }

    let shipment: ShipStationShipment | null = null;
    try {
      const shipments = await listShipStationShipments(credentials, {
        orderId: order.orderId,
        orderNumber: order.orderNumber,
      });
      shipment = pickLatestShipment(shipments);
    } catch {
      shipment = null;
    }
    return applyShipStationShipment(userId, orderId, order, shipment);
  });
}

export async function updateSoldOrdersFromShipStation(userId: string) {
  if (!(await isShipStationConnected(userId))) {
    throw new Error("Connect ShipStation in Settings before updating orders.");
  }

  const rows = await prisma.soldOrder.findMany({
    where: { userId },
    select: {
      orderId: true,
      shipStationOrderId: true,
      shipStationStatus: true,
      trackingNumber: true,
    },
  });
  const pending = rows.filter((row) => {
    if (!row.shipStationOrderId) return false;
    return row.shipStationStatus !== "shipped" || !row.trackingNumber;
  });

  let checked = 0;
  let shipped = 0;
  for (const row of pending) {
    try {
      const result = await checkSoldOrderOnShipStation(userId, row.orderId);
      checked += 1;
      if (result.updated || result.orderStatus === "shipped" || result.trackingNumber) {
        shipped += 1;
      }
    } catch {
      // Keep checking remaining orders.
    }
  }

  await markIntegrationSynced(userId, SHIPSTATION_PROVIDER);
  return { checked, shipped };
}
