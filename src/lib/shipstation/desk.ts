import type { ImportProgressHandler } from "@/lib/import-progress";
import { markIntegrationSynced } from "@/lib/integration-sync";
import type { SoldOrderSource } from "@/lib/gunbroker/orders";
import { prisma } from "@/lib/prisma";
import { sourceFromShipStationBlob } from "@/lib/sold-order-filters";
import {
  getShipStationOrder,
  listShipStationOrdersByStatus,
  listShipStationShipments,
} from "@/lib/shipstation/client";
import { SHIPSTATION_PROVIDER } from "@/lib/shipstation/config";
import { formatShipStationCarrier } from "@/lib/shipstation/sold-orders";
import { isShipStationConnected, withShipStationAccess } from "@/lib/shipstation/service";
import { updateSoldOrdersFromShipStation } from "@/lib/shipstation/sold-orders";
import type { ShipStationDeskRow, ShipStationDeskSource } from "@/lib/shipstation/types";
import { listUnshippedWooOrders } from "@/lib/woocommerce/service";

function resolveDeskSource(
  existingDetails: Record<string, unknown>,
  shipStationSource: string | null | undefined,
  gunBrokerHints: boolean,
  wooOrderNumbers?: Set<string>,
  orderNumber?: string,
): SoldOrderSource {
  const current = existingDetails.source;
  if (current === "gunbroker" || current === "woocommerce") {
    return current;
  }
  if (gunBrokerHints) return "gunbroker";
  const fromBlob = sourceFromShipStationBlob(shipStationSource);
  if (fromBlob !== "other") return fromBlob;
  if (orderNumber && wooOrderNumbers?.has(normalizeOrderNumber(orderNumber))) {
    return "woocommerce";
  }
  if (current === "other") return "other";
  return "other";
}

function normalizeOrderNumber(value: string) {
  return value.trim().replace(/^#/, "");
}

function wooOrderNumberSet(
  orders: { orderId: number; orderNumber: string }[],
): Set<string> {
  const keys = new Set<string>();
  for (const order of orders) {
    keys.add(normalizeOrderNumber(String(order.orderId)));
    keys.add(normalizeOrderNumber(order.orderNumber));
  }
  return keys;
}

const AWAITING_STATUSES = ["awaiting_shipment", "pending_fulfillment"] as const;

function toIso(value: Date | string | null | undefined) {
  if (!value) return null;
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function channelHintsFromRow(row: {
  gunBrokerNotified: boolean;
  buyerUsername: string | null;
  itemIdsJson: string;
  detailsJson: string;
}) {
  let itemIds: unknown[] = [];
  try {
    itemIds = JSON.parse(row.itemIdsJson) as unknown[];
  } catch {
    itemIds = [];
  }
  let details: Record<string, unknown> = {};
  try {
    details = JSON.parse(row.detailsJson) as Record<string, unknown>;
  } catch {
    details = {};
  }
  const source = details.source;
  if (source === "gunbroker" || source === "woocommerce") return true;
  return Boolean(
    row.gunBrokerNotified ||
      row.buyerUsername ||
      details.buyerUserId ||
      details.buyerUsername ||
      (Array.isArray(itemIds) && itemIds.length > 0),
  );
}

function deskSourceFromRow(row: {
  gunBrokerNotified: boolean;
  buyerUsername: string | null;
  itemIdsJson: string;
  detailsJson: string;
}): ShipStationDeskSource {
  let details: Record<string, unknown> = {};
  try {
    details = JSON.parse(row.detailsJson) as Record<string, unknown>;
  } catch {
    details = {};
  }
  const explicit = details.source;
  if (explicit === "gunbroker" || explicit === "woocommerce" || explicit === "other") {
    return explicit;
  }
  if (channelHintsFromRow(row)) return "gunbroker";
  return sourceFromShipStationBlob(
    typeof details.source === "string" ? details.source : null,
  );
}

function rowFromDb(row: {
  orderId: string;
  title: string | null;
  buyerName: string | null;
  buyerUsername: string | null;
  gunBrokerNotified: boolean;
  itemIdsJson: string;
  orderDate: Date | null;
  trackingNumber: string | null;
  carrier: string | null;
  shipStationOrderId: string | null;
  shipStationStatus: string | null;
  deliveryStatus: string | null;
  deliveryStatusLabel: string | null;
  estimatedDeliveryAt: Date | null;
  deliveredAt: Date | null;
  trackingSyncedAt: Date | null;
  detailsJson: string;
}): ShipStationDeskRow {
  let shipDate: string | null = null;
  let shipByDate: string | null = null;
  try {
    const details = JSON.parse(row.detailsJson) as {
      shippedDate?: string | null;
      shipByDate?: string | null;
    };
    shipDate = details.shippedDate ?? null;
    shipByDate = details.shipByDate ?? null;
  } catch {
    // ignore
  }
  return {
    orderId: row.orderId,
    shipStationOrderId: row.shipStationOrderId,
    title: row.title,
    buyerName: row.buyerName,
    orderDate: toIso(row.orderDate),
    shipDate,
    shipByDate,
    trackingNumber: row.trackingNumber,
    carrier: row.carrier,
    shipStationStatus: row.shipStationStatus,
    deliveryStatus: row.deliveryStatus,
    deliveryStatusLabel: row.deliveryStatusLabel,
    estimatedDeliveryAt: toIso(row.estimatedDeliveryAt),
    deliveredAt: toIso(row.deliveredAt),
    trackingSyncedAt: toIso(row.trackingSyncedAt),
    source: deskSourceFromRow(row),
  };
}

/** Drop ShipStation-only shipped/in-transit rows that were imported for tracking. */
async function purgeShipStationOnlyShipments(userId: string) {
  const candidates = await prisma.soldOrder.findMany({
    where: {
      userId,
      OR: [
        { trackingNumber: { not: null } },
        { shipStationStatus: "shipped" },
        {
          deliveryStatus: {
            in: ["in_transit", "delivered", "exception", "unknown"],
          },
        },
      ],
    },
    select: {
      id: true,
      gunBrokerNotified: true,
      buyerUsername: true,
      itemIdsJson: true,
      detailsJson: true,
    },
  });

  const ids = candidates.filter((row) => !channelHintsFromRow(row)).map((row) => row.id);
  if (!ids.length) return 0;
  await prisma.soldOrder.deleteMany({ where: { id: { in: ids } } });
  return ids.length;
}

async function syncAwaitingOrders(userId: string) {
  return withShipStationAccess(userId, async (credentials) => {
    let synced = 0;
    const seen = new Set<string>();
    const wooOpen = await listUnshippedWooOrders(userId);
    const wooOrderNumbers = wooOrderNumberSet(wooOpen.orders);

    for (const status of AWAITING_STATUSES) {
      let page = 1;
      let pages = 1;
      while (page <= pages && page <= 10) {
        const result = await listShipStationOrdersByStatus(credentials, status, page, 100);
        pages = Math.max(1, result.pages);
        for (const order of result.orders) {
          seen.add(order.orderNumber);
          const existing = await prisma.soldOrder.findUnique({
            where: { userId_orderId: { userId, orderId: order.orderNumber } },
            select: {
              detailsJson: true,
              title: true,
              buyerName: true,
              buyerUsername: true,
              trackingNumber: true,
              deliveryStatus: true,
              gunBrokerNotified: true,
              itemIdsJson: true,
            },
          });
          let details: Record<string, unknown> = {};
          if (existing?.detailsJson) {
            try {
              details = JSON.parse(existing.detailsJson) as Record<string, unknown>;
            } catch {
              details = {};
            }
          }
          details.shipByDate = order.shipByDate;
          details.shipStationSource = order.source;
          let itemIds: unknown[] = [];
          try {
            itemIds = existing?.itemIdsJson
              ? (JSON.parse(existing.itemIdsJson) as unknown[])
              : [];
          } catch {
            itemIds = [];
          }
          const gunBrokerHints = Boolean(
            existing?.gunBrokerNotified ||
              existing?.buyerUsername ||
              details.buyerUserId ||
              details.buyerUsername ||
              (Array.isArray(itemIds) && itemIds.length > 0),
          );
          details.source = resolveDeskSource(
            details,
            order.source,
            gunBrokerHints,
            wooOrderNumbers,
            order.orderNumber,
          );

          const stillAwaiting = !existing?.trackingNumber;
          await prisma.soldOrder.upsert({
            where: { userId_orderId: { userId, orderId: order.orderNumber } },
            create: {
              userId,
              orderId: order.orderNumber,
              orderStatus: 4,
              orderStatusLabel: "Pending shipment",
              buyerName: order.shipToName,
              orderDate: parseDate(order.orderDate),
              title: order.itemName,
              itemCount: order.itemQuantity ?? 1,
              detailsJson: JSON.stringify({
                orderNumber: order.orderNumber,
                shipByDate: order.shipByDate,
                shipStationSource: order.source,
                source: resolveDeskSource(
                  {},
                  order.source,
                  false,
                  wooOrderNumbers,
                  order.orderNumber,
                ),
                items: order.itemName
                  ? [
                      {
                        itemId: null,
                        title: order.itemName,
                        quantity: order.itemQuantity ?? 1,
                        price: null,
                        sku: null,
                        thumbnailUrl: null,
                      },
                    ]
                  : [],
              }),
              shipStationOrderId: String(order.orderId),
              shipStationStatus: order.orderStatus,
              shipStationSyncedAt: new Date(),
              deliveryStatus: "awaiting_shipment",
              deliveryStatusLabel: "Awaiting shipment",
              workStatus: "pending",
            },
            update: {
              shipStationOrderId: String(order.orderId),
              shipStationStatus: order.orderStatus,
              shipStationSyncedAt: new Date(),
              title: existing?.title ?? order.itemName,
              buyerName: existing?.buyerName ?? order.shipToName,
              detailsJson: JSON.stringify(details),
              ...(stillAwaiting
                ? {
                    deliveryStatus: "awaiting_shipment",
                    deliveryStatusLabel: "Awaiting shipment",
                    estimatedDeliveryAt: null,
                    deliveredAt: null,
                  }
                : {}),
            },
          });
          synced += 1;
        }
        page += 1;
      }
    }

    // Local rows still marked awaiting but no longer in ShipStation's open queue —
    // reconcile shipped/cancelled so they drop off Needs to ship.
    if (seen.size > 0) {
      const stale = await prisma.soldOrder.findMany({
        where: {
          userId,
          orderId: { notIn: [...seen] },
          OR: [
            { shipStationStatus: { in: [...AWAITING_STATUSES] } },
            { deliveryStatus: "awaiting_shipment" },
          ],
        },
        select: {
          id: true,
          orderId: true,
          shipStationOrderId: true,
          gunBrokerNotified: true,
          buyerUsername: true,
          itemIdsJson: true,
          detailsJson: true,
          carrier: true,
        },
      });
      for (const row of stale) {
        const ssId = row.shipStationOrderId ? Number(row.shipStationOrderId) : NaN;
        if (!Number.isFinite(ssId)) {
          if (!channelHintsFromRow(row)) {
            await prisma.soldOrder.delete({ where: { id: row.id } });
          }
          continue;
        }
        try {
          const live = await getShipStationOrder(credentials, ssId);
          let trackingNumber = live.trackingNumber;
          let carrierCode = live.carrierCode;
          let serviceCode = live.serviceCode;
          let shipDate = live.shipDate;
          if (!trackingNumber || live.orderStatus === "shipped") {
            try {
              const shipments = await listShipStationShipments(credentials, {
                orderId: ssId,
                orderNumber: row.orderId,
              });
              const latest = shipments.find((s) => !s.voided && s.trackingNumber) ?? shipments[0];
              if (latest) {
                trackingNumber = latest.trackingNumber ?? trackingNumber;
                carrierCode = latest.carrierCode ?? carrierCode;
                serviceCode = latest.serviceCode ?? serviceCode;
                shipDate = latest.shipDate ?? shipDate;
              }
            } catch {
              // keep order fields
            }
          }
          let details: Record<string, unknown> = {};
          try {
            details = JSON.parse(row.detailsJson) as Record<string, unknown>;
          } catch {
            details = {};
          }
          details.source = resolveDeskSource(
            details,
            live.source,
            channelHintsFromRow(row),
            wooOrderNumbers,
            row.orderId,
          );
          details.shipStationSource = live.source;
          details.shippedDate = shipDate ?? details.shippedDate ?? null;
          details.trackingNumber = trackingNumber ?? details.trackingNumber ?? null;

          const shipped =
            live.orderStatus === "shipped" ||
            Boolean(trackingNumber?.trim()) ||
            Boolean(shipDate);

          if (shipped) {
            await prisma.soldOrder.update({
              where: { id: row.id },
              data: {
                shipStationStatus: "shipped",
                shipStationSyncedAt: new Date(),
                trackingNumber: trackingNumber?.trim() || null,
                carrier:
                  formatShipStationCarrier(carrierCode, serviceCode) ?? row.carrier,
                detailsJson: JSON.stringify(details),
                deliveryStatus: "in_transit",
                deliveryStatusLabel: "Shipped",
              },
            });
          } else if (live.orderStatus === "cancelled") {
            if (!channelHintsFromRow(row)) {
              await prisma.soldOrder.delete({ where: { id: row.id } });
            } else {
              await prisma.soldOrder.update({
                where: { id: row.id },
                data: {
                  shipStationStatus: "cancelled",
                  shipStationSyncedAt: new Date(),
                  deliveryStatus: null,
                  deliveryStatusLabel: null,
                  detailsJson: JSON.stringify(details),
                },
              });
            }
          } else if (!channelHintsFromRow(row)) {
            await prisma.soldOrder.delete({ where: { id: row.id } });
          }
        } catch {
          if (!channelHintsFromRow(row)) {
            await prisma.soldOrder.delete({ where: { id: row.id } }).catch(() => undefined);
          }
        }
      }
    }

    return synced;
  });
}

export async function listShipStationAwaiting(userId: string): Promise<ShipStationDeskRow[]> {
  const [rows, wooOpen] = await Promise.all([
    prisma.soldOrder.findMany({
      where: {
        userId,
        deliveryStatus: { not: "delivered" },
        OR: [
          { shipStationStatus: { in: [...AWAITING_STATUSES] } },
          { deliveryStatus: "awaiting_shipment" },
          {
            AND: [
              { shipStationOrderId: { not: null } },
              { trackingNumber: null },
              { shipStationStatus: { notIn: ["shipped", "cancelled"] } },
            ],
          },
        ],
      },
      orderBy: [{ orderDate: "desc" }, { updatedAt: "desc" }],
    }),
    listUnshippedWooOrders(userId),
  ]);
  const wooOrderNumbers = wooOrderNumberSet(wooOpen.orders);
  return rows
    .filter((row) => !row.trackingNumber && row.shipStationStatus !== "shipped")
    .map((row) => {
      const desk = rowFromDb(row);
      if (
        desk.source === "other" &&
        wooOrderNumbers.has(normalizeOrderNumber(row.orderId))
      ) {
        return { ...desk, source: "woocommerce" as const };
      }
      return desk;
    });
}

export async function updateShipStationDesk(
  userId: string,
  onProgress?: ImportProgressHandler,
) {
  if (!(await isShipStationConnected(userId))) {
    throw new Error("Connect ShipStation in Settings before updating tracking.");
  }

  await onProgress?.({ loaded: 0, total: 3, phase: "loading" });
  const awaitingSynced = await syncAwaitingOrders(userId);
  await onProgress?.({ loaded: 1, total: 3, phase: "loading" });
  const purged = await purgeShipStationOnlyShipments(userId);
  await onProgress?.({ loaded: 2, total: 3, phase: "loading" });
  // Pull tracking for known Chamber orders and notify GunBroker when shipped.
  const shipmentUpdate = await updateSoldOrdersFromShipStation(userId);
  await onProgress?.({ loaded: 3, total: 3, phase: "saving" });

  await markIntegrationSynced(userId, SHIPSTATION_PROVIDER);
  return {
    count: awaitingSynced,
    awaitingSynced,
    purged,
    tracked: shipmentUpdate.checked,
    delivered: shipmentUpdate.shipped,
    withEta: shipmentUpdate.notified,
  };
}
