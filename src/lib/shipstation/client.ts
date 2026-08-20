import { SHIPSTATION_API_URL } from "@/lib/shipstation/config";
import {
  ShipStationApiError,
  type ShipStationCreateOrderInput,
  type ShipStationOrder,
  type ShipStationSecrets,
  type ShipStationShipment,
} from "@/lib/shipstation/types";

type RequestOptions = {
  credentials: ShipStationSecrets;
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
  method?: "GET" | "POST";
  body?: unknown;
};

function asRecord(value: unknown) {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown) {
  if (value == null) return null;
  const next = String(value).trim();
  return next.length ? next : null;
}

function asNumber(value: unknown) {
  if (value == null || value === "") return null;
  const next = typeof value === "number" ? value : Number(value);
  return Number.isFinite(next) ? next : null;
}

function authHeader(credentials: ShipStationSecrets) {
  const token = Buffer.from(`${credentials.apiKey}:${credentials.apiSecret}`).toString("base64");
  return `Basic ${token}`;
}

function errorFrom(status: number, payload: unknown) {
  const record = asRecord(payload);
  const message =
    asString(record?.Message) ??
    asString(record?.message) ??
    asString(record?.ExceptionMessage) ??
    `ShipStation request failed (${status}).`;
  return new ShipStationApiError(status, message);
}

async function shipStationRequest<T>(options: RequestOptions): Promise<T> {
  const url = new URL(`${SHIPSTATION_API_URL}${options.path}`);
  if (options.query) {
    for (const [key, value] of Object.entries(options.query)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const response = await fetch(url, {
    method: options.method ?? "GET",
    headers: {
      Authorization: authHeader(options.credentials),
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  if (!response.ok) {
    throw errorFrom(response.status, payload);
  }

  return payload as T;
}

function firstShipment(raw: unknown): Record<string, unknown> | null {
  if (Array.isArray(raw)) {
    for (const item of raw) {
      const record = asRecord(item);
      if (record && !record.voided) return record;
    }
    return asRecord(raw[0]);
  }
  return asRecord(raw);
}

function trackingFrom(record: Record<string, unknown> | null) {
  if (!record) return null;
  return (
    asString(record.trackingNumber) ??
    asString(record.tracking) ??
    asString(record.TrackingNumber) ??
    asString(record.tracking_number)
  );
}

function findTrackingNumber(value: unknown, depth = 0): string | null {
  if (depth > 6 || value == null) return null;
  const record = asRecord(value);
  if (record) {
    const direct = trackingFrom(record);
    if (direct) return direct;
    for (const next of Object.values(record)) {
      const found = findTrackingNumber(next, depth + 1);
      if (found) return found;
    }
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findTrackingNumber(item, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function mapOrder(raw: unknown): ShipStationOrder | null {
  const record = asRecord(raw);
  if (!record) return null;
  const orderId = asNumber(record.orderId);
  const orderNumber = asString(record.orderNumber);
  if (orderId == null || !orderNumber) return null;
  const nested = firstShipment(record.shipments) ?? firstShipment(record.fulfillments);
  return {
    orderId,
    orderNumber,
    orderKey: asString(record.orderKey) ?? "",
    orderStatus: asString(record.orderStatus) ?? "unknown",
    orderDate: asString(record.orderDate) ?? "",
    shipDate: asString(record.shipDate) ?? asString(nested?.shipDate),
    trackingNumber: trackingFrom(record) ?? trackingFrom(nested) ?? findTrackingNumber(raw),
    carrierCode: asString(record.carrierCode) ?? asString(nested?.carrierCode),
    serviceCode: asString(record.serviceCode) ?? asString(nested?.serviceCode),
  };
}

function mapShipment(raw: unknown): ShipStationShipment | null {
  const record = asRecord(raw);
  if (!record) return null;
  const shipmentId = asNumber(record.shipmentId);
  const orderId = asNumber(record.orderId);
  if (shipmentId == null || orderId == null) return null;
  return {
    shipmentId,
    orderId,
    orderNumber: asString(record.orderNumber) ?? "",
    carrierCode: asString(record.carrierCode),
    serviceCode: asString(record.serviceCode),
    trackingNumber: trackingFrom(record),
    shipDate: asString(record.shipDate),
    voided: Boolean(record.voided),
  };
}

export async function pingShipStation(credentials: ShipStationSecrets) {
  const payload = await shipStationRequest<{ stores?: unknown[] }>({
    credentials,
    path: "/stores",
    query: { pageSize: 1 },
  });
  const stores = Array.isArray(payload.stores) ? payload.stores.length : 0;
  return { storeCount: stores };
}

export async function listShipStationOrdersByNumber(
  credentials: ShipStationSecrets,
  orderNumber: string,
) {
  const payload = await shipStationRequest<{ orders?: unknown[] }>({
    credentials,
    path: "/orders",
    query: { orderNumber, pageSize: 25 },
  });
  const orders = Array.isArray(payload.orders)
    ? payload.orders.map(mapOrder).filter((order): order is ShipStationOrder => Boolean(order))
    : [];
  return orders.filter((order) => order.orderNumber === orderNumber);
}

export async function listShipStationShipments(
  credentials: ShipStationSecrets,
  args: { orderId?: number; orderNumber?: string },
) {
  const queries: Array<Record<string, string | number | boolean | undefined | null>> = [];
  if (args.orderId != null) queries.push({ orderId: args.orderId, pageSize: 50 });
  if (args.orderNumber) queries.push({ orderNumber: args.orderNumber, pageSize: 50 });
  if (!queries.length) return [];

  const seen = new Set<number>();
  const shipments: ShipStationShipment[] = [];
  for (const query of queries) {
    const payload = await shipStationRequest<{ shipments?: unknown[] }>({
      credentials,
      path: "/shipments",
      query,
    });
    const rows = Array.isArray(payload.shipments)
      ? payload.shipments.map(mapShipment).filter((row): row is ShipStationShipment => Boolean(row))
      : [];
    for (const row of rows) {
      if (row.voided || seen.has(row.shipmentId)) continue;
      seen.add(row.shipmentId);
      shipments.push(row);
    }
  }
  return shipments;
}

export async function createShipStationOrder(
  credentials: ShipStationSecrets,
  input: ShipStationCreateOrderInput,
) {
  const payload = await shipStationRequest<unknown>({
    credentials,
    path: "/orders/createorder",
    method: "POST",
    body: {
      orderStatus: "awaiting_shipment",
      ...input,
    },
  });
  const order = mapOrder(payload);
  if (!order) {
    throw new ShipStationApiError(500, "ShipStation did not return the created order.");
  }
  return order;
}

export async function getShipStationOrder(
  credentials: ShipStationSecrets,
  orderId: number,
) {
  const payload = await shipStationRequest<unknown>({
    credentials,
    path: `/orders/${orderId}`,
  });
  const order = mapOrder(payload);
  if (!order) {
    throw new ShipStationApiError(404, "ShipStation order not found.");
  }
  return order;
}
