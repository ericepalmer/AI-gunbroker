import { SHIPSTATION_API_URL } from "@/lib/shipstation/config";
import {
  ShipStationApiError,
  type ShipStationCreateOrderInput,
  type ShipStationOrder,
  type ShipStationSecrets,
  type ShipStationShipment,
  type ShipStationTracking,
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

function firstItem(raw: unknown) {
  if (!Array.isArray(raw) || !raw.length) return null;
  return asRecord(raw[0]);
}

function mapOrder(raw: unknown): ShipStationOrder | null {
  const record = asRecord(raw);
  if (!record) return null;
  const orderId = asNumber(record.orderId);
  const orderNumber = asString(record.orderNumber);
  if (orderId == null || !orderNumber) return null;
  const nested = firstShipment(record.shipments) ?? firstShipment(record.fulfillments);
  const shipTo = asRecord(record.shipTo);
  const item = firstItem(record.items);
  const advanced = asRecord(record.advancedOptions);
  return {
    orderId,
    orderNumber,
    orderKey: asString(record.orderKey) ?? "",
    orderStatus: asString(record.orderStatus) ?? "unknown",
    orderDate: asString(record.orderDate) ?? "",
    shipDate: asString(record.shipDate) ?? asString(nested?.shipDate),
    shipByDate: asString(record.shipByDate),
    trackingNumber: trackingFrom(record) ?? trackingFrom(nested) ?? findTrackingNumber(raw),
    carrierCode: asString(record.carrierCode) ?? asString(nested?.carrierCode),
    serviceCode: asString(record.serviceCode) ?? asString(nested?.serviceCode),
    customerEmail: asString(record.customerEmail),
    shipToName: asString(shipTo?.name) ?? asString(record.shipToName),
    itemName: asString(item?.name) ?? asString(item?.description),
    itemQuantity: asNumber(item?.quantity),
    source:
      asString(advanced?.source) ??
      asString(record.source) ??
      asString(record.orderKey)?.match(/^([a-z]+)-/i)?.[1] ??
      null,
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

export async function listShipStationOrdersByStatus(
  credentials: ShipStationSecrets,
  orderStatus: string,
  page = 1,
  pageSize = 100,
) {
  const payload = await shipStationRequest<{
    orders?: unknown[];
    pages?: number;
    page?: number;
  }>({
    credentials,
    path: "/orders",
    query: { orderStatus, page, pageSize, sortBy: "OrderDate", sortDir: "DESC" },
  });
  const orders = Array.isArray(payload.orders)
    ? payload.orders.map(mapOrder).filter((order): order is ShipStationOrder => Boolean(order))
    : [];
  return {
    orders,
    page: asNumber(payload.page) ?? page,
    pages: asNumber(payload.pages) ?? 1,
  };
}

function mapTracking(raw: unknown): ShipStationTracking | null {
  const record = asRecord(raw);
  if (!record) return null;
  const trackingNumber = trackingFrom(record);
  if (!trackingNumber) return null;
  return {
    trackingNumber,
    carrierCode: asString(record.carrier_code) ?? asString(record.carrierCode),
    statusCode: asString(record.status_code) ?? asString(record.statusCode),
    statusDescription:
      asString(record.status_description) ??
      asString(record.statusDescription) ??
      asString(record.carrier_status_description),
    estimatedDeliveryDate:
      asString(record.estimated_delivery_date) ?? asString(record.estimatedDeliveryDate),
    actualDeliveryDate:
      asString(record.actual_delivery_date) ?? asString(record.actualDeliveryDate),
  };
}

/**
 * Best-effort carrier tracking. Uses ShipStation/ShipEngine tracking when the
 * account key supports it; returns null when the provider rejects the call.
 */
export async function trackShipStationPackage(
  credentials: ShipStationSecrets,
  carrierCode: string,
  trackingNumber: string,
): Promise<ShipStationTracking | null> {
  const code = carrierCode.trim().toLowerCase();
  const tracking = trackingNumber.trim();
  if (!code || !tracking) return null;

  const url = new URL("https://api.shipstation.com/v2/tracking");
  url.searchParams.set("carrier_code", code);
  url.searchParams.set("tracking_number", tracking);

  const attempts: HeadersInit[] = [
    { "API-Key": credentials.apiKey, Accept: "application/json" },
    {
      Authorization: authHeader(credentials),
      Accept: "application/json",
    },
  ];

  for (const headers of attempts) {
    try {
      const response = await fetch(url, {
        method: "GET",
        headers,
        cache: "no-store",
        signal: AbortSignal.timeout(12_000),
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
      if (!response.ok) continue;
      const mapped = mapTracking(payload);
      if (mapped) return mapped;
    } catch {
      // Try the next auth style.
    }
  }
  return null;
}

export async function listShipStationShipments(
  credentials: ShipStationSecrets,
  args: {
    orderId?: number;
    orderNumber?: string;
    shipDateStart?: string;
    page?: number;
    pageSize?: number;
  },
) {
  const queries: Array<Record<string, string | number | boolean | undefined | null>> = [];
  if (args.orderId != null) {
    queries.push({
      orderId: args.orderId,
      pageSize: args.pageSize ?? 50,
      page: args.page ?? 1,
    });
  }
  if (args.orderNumber) {
    queries.push({
      orderNumber: args.orderNumber,
      pageSize: args.pageSize ?? 50,
      page: args.page ?? 1,
    });
  }
  if (args.shipDateStart && !args.orderId && !args.orderNumber) {
    queries.push({
      shipDateStart: args.shipDateStart,
      pageSize: args.pageSize ?? 100,
      page: args.page ?? 1,
      sortBy: "ShipDate",
      sortDir: "DESC",
    });
  }
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
