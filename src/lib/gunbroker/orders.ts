import { getOrder, listOrdersSold } from "@/lib/gunbroker/client";
import { gunBrokerEmailFrom, gunBrokerKeyPairLabel } from "@/lib/gunbroker/order-fields";
import { defaultWorkStatus, gunBrokerBuyerNotified, inferOrderStatusFromFlags, orderStatusLabel, resolveOrderStatus } from "@/lib/gunbroker/order-status";
import { isGunBrokerConnected, withGunBrokerAccess } from "@/lib/gunbroker/service";
import {
  asBoolean,
  asEnumId,
  asList,
  asMoney,
  asNumber,
  asString,
  pickField,
} from "@/lib/gunbroker/types";
import {
  reportImportProgress,
  reportSaveProgress,
  type ImportProgressHandler,
} from "@/lib/import-progress";
import { prisma } from "@/lib/prisma";
import { markIntegrationSynced } from "@/lib/integration-sync";

export type SoldOrderLineItem = {
  itemId: string;
  title: string;
  thumbnailUrl: string | null;
  price: number | null;
  quantity: number;
  subtotal: number | null;
  salesTax: number | null;
  sku: string | null;
};

export type SoldOrderShipTo = {
  name: string | null;
  company: string | null;
  street1: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  phone: string | null;
};

export type SoldOrderDetails = {
  orderNumber: string;
  buyerFullName: string | null;
  buyerUsername: string | null;
  buyerUserId: string | null;
  buyerEmail: string | null;
  shippedDate: string | null;
  shipTo: SoldOrderShipTo | null;
  items: SoldOrderLineItem[];
  subtotal: number | null;
  shippingType: string | null;
  shippingCost: number | null;
  taxesAndFees: number | null;
  complianceFee: number | null;
  total: number | null;
  trackingNumber: string | null;
  carrier: string | null;
};

export type SoldOrderCard = {
  id: string;
  orderId: string;
  orderStatus: number;
  orderStatusLabel: string;
  itemShipped: boolean;
  orderComplete: boolean;
  buyerUsername: string | null;
  buyerName: string | null;
  orderDate: string | null;
  totalAmount: number | null;
  itemCount: number;
  title: string;
  thumbnailUrl: string | null;
  itemIds: string[];
  items: SoldOrderLineItem[];
  shipTo: SoldOrderShipTo | null;
  details: SoldOrderDetails | null;
  trackingNumber: string | null;
  carrier: string | null;
  shipStationOrderId: string | null;
  shipStationStatus: string | null;
  shipStationSyncedAt: string | null;
  /** True when GunBroker shows the buyer was notified (complete). Independent of ShipStation. */
  gunBrokerNotified: boolean;
  workStatus: "pending" | "complete";
  lastImportedAt: string;
  completedAt: string | null;
  shippedDate: string | null;
};

type MappedSoldOrder = {
  orderId: string;
  orderStatus: number;
  orderStatusLabel: string;
  itemShipped: boolean;
  orderComplete: boolean;
  buyerUsername: string | null;
  buyerName: string | null;
  orderDate: Date | null;
  totalAmount: number | null;
  itemCount: number;
  title: string;
  thumbnailUrl: string | null;
  itemIds: string[];
  items: SoldOrderLineItem[];
  shipTo: SoldOrderShipTo | null;
  details: SoldOrderDetails;
  trackingNumber: string | null;
  carrier: string | null;
};

function orderIdOf(order: unknown) {
  return asString(pickField(order, "orderID", "OrderID", "orderId"));
}

function buyerSummary(order: unknown) {
  const buyer = pickField(order, "buyer", "Buyer");
  if (!buyer || typeof buyer !== "object") {
    return { username: null, name: null, userId: null, email: null };
  }
  const username = asString(
    pickField(buyer, "userName", "UserName", "username", "Username"),
  );
  const userId = asString(pickField(buyer, "userID", "UserID", "userId", "id", "ID"));
  const firstName = asString(pickField(buyer, "firstName", "FirstName"));
  const lastName = asString(pickField(buyer, "lastName", "LastName"));
  const name = [firstName, lastName].filter(Boolean).join(" ") || null;
  const email = asString(pickField(buyer, "email", "Email"));
  return { username, name: name ?? null, userId, email };
}

function buyerEmailFrom(
  order: unknown,
  buyer: { email: string | null },
) {
  return gunBrokerEmailFrom(order, buyer.email);
}

function parseDate(value: unknown) {
  const raw = asString(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

function orderItemsFrom(order: unknown): SoldOrderLineItem[] {
  const collection = pickField(
    order,
    "orderItemsCollection",
    "OrderItemsCollection",
    "orderItems",
    "OrderItems",
    "items",
    "Items",
  );
  const rows = asList(collection);
  const items: SoldOrderLineItem[] = [];
  for (const row of rows) {
    const itemId = asString(pickField(row, "itemID", "ItemID", "itemId"));
    const title = asString(pickField(row, "title", "Title", "itemTitle", "ItemTitle"));
    if (!itemId || !title) continue;
    const quantity = Math.max(1, Math.round(asNumber(pickField(row, "quantity", "Quantity")) ?? 1));
    const price = asMoney(
      pickField(row, "itemPrice", "ItemPrice", "salePrice", "SalePrice", "price", "Price"),
    );
    items.push({
      itemId,
      title,
      thumbnailUrl: asString(
        pickField(row, "thumbnailURL", "ThumbnailURL", "thumbnailUrl", "thumbnail", "Thumbnail"),
      ),
      price,
      quantity,
      subtotal: asMoney(
        pickField(row, "itemSubTotal", "ItemSubTotal", "subTotal", "SubTotal"),
      ),
      salesTax: asMoney(pickField(row, "salesTax", "SalesTax")),
      sku: asString(pickField(row, "sku", "SKU")),
    });
  }
  return items;
}

function itemIdsFrom(order: unknown, items: SoldOrderLineItem[]) {
  const raw = pickField(order, "itemIDs", "ItemIDs", "itemIds");
  if (Array.isArray(raw)) {
    return raw
      .map((value) => asString(value))
      .filter((value): value is string => Boolean(value));
  }
  return items.map((item) => item.itemId);
}

function shipToFrom(order: unknown): SoldOrderShipTo | null {
  const shipTo =
    pickField(order, "shipTo", "ShipTo", "shippingAddress", "ShippingAddress") ??
    pickField(order, "shipToAddress", "ShipToAddress");
  if (shipTo && typeof shipTo === "object") {
    const next = {
      name: asString(pickField(shipTo, "name", "Name", "shipToName", "ShipToName")),
      company: asString(pickField(shipTo, "company", "Company", "shipToCompany", "ShipToCompany")),
      street1: asString(
        pickField(shipTo, "street1", "Street1", "address1", "Address1", "street", "Street"),
      ),
      street2: asString(pickField(shipTo, "street2", "Street2", "address2", "Address2")),
      city: asString(pickField(shipTo, "city", "City", "shipToCity", "ShipToCity")),
      state: asString(
        pickField(shipTo, "state", "State", "stateCode", "StateCode", "shipToState", "ShipToState"),
      ),
      postalCode: asString(
        pickField(
          shipTo,
          "postalCode",
          "PostalCode",
          "zip",
          "Zip",
          "zipCode",
          "ZipCode",
          "shipToZip",
          "ShipToZip",
        ),
      ),
      country: asString(
        pickField(shipTo, "country", "Country", "countryCode", "CountryCode", "shipToCountry", "ShipToCountry"),
      ),
      phone: asString(
        pickField(shipTo, "phone", "Phone", "phoneNumber", "PhoneNumber", "shipToPhone", "ShipToPhone"),
      ),
    };
    if (Object.values(next).some(Boolean)) return next;
  }

  const flat = {
    name: asString(pickField(order, "shipToName", "ShipToName")),
    company: asString(pickField(order, "shipToCompany", "ShipToCompany")),
    street1: asString(pickField(order, "shipToAddress1", "ShipToAddress1", "shipToStreet1", "ShipToStreet1")),
    street2: asString(pickField(order, "shipToAddress2", "ShipToAddress2", "shipToStreet2", "ShipToStreet2")),
    city: asString(pickField(order, "shipToCity", "ShipToCity")),
    state: asString(pickField(order, "shipToState", "ShipToState")),
    postalCode: asString(pickField(order, "shipToZip", "ShipToZip", "shipToPostalCode", "ShipToPostalCode")),
    country: asString(pickField(order, "shipToCountry", "ShipToCountry")),
    phone: asString(pickField(order, "shipToPhone", "ShipToPhone")),
  };
  if (Object.values(flat).every((value) => !value)) return null;
  return flat;
}

function shippingTypeFrom(order: unknown) {
  return labelFromField(
    pickField(
      order,
      "shipClass",
      "ShipClass",
      "shippingClass",
      "ShippingClass",
      "shippingMethod",
      "ShippingMethod",
      "shipMethod",
      "ShipMethod",
      "shippingType",
      "ShippingType",
    ),
  );
}

function sumItemSubtotals(items: SoldOrderLineItem[]) {
  const values = items.map((item) => item.subtotal ?? (item.price != null ? item.price * item.quantity : null));
  if (values.every((value) => value == null)) return null;
  return values.reduce<number>((sum, value) => sum + (value ?? 0), 0);
}

function labelFromField(value: unknown) {
  return gunBrokerKeyPairLabel(value);
}

function shippedDateFrom(order: unknown) {
  return parseDate(
    pickField(
      order,
      "shipDate",
      "ShipDate",
      "itemShippedDate",
      "ItemShippedDate",
      "sellerSentItemDate",
      "SellerSentItemDate",
      "orderCompleteDate",
      "OrderCompleteDate",
    ),
  );
}

function buildOrderDetails(
  order: unknown,
  orderId: string,
  buyer: { username: string | null; name: string | null; userId: string | null; email: string | null },
): SoldOrderDetails {
  const items = orderItemsFrom(order);
  const shipTo = shipToFrom(order);
  const shippingCost = asMoney(
    pickField(order, "shipCost", "ShipCost", "shippingCost", "ShippingCost"),
  );
  const taxesAndFees = asMoney(
    pickField(order, "salesTaxTotal", "SalesTaxTotal", "taxTotal", "TaxTotal"),
  );
  const complianceFee = asMoney(
    pickField(order, "complianceFee", "ComplianceFee", "marketplaceServiceFee", "MarketplaceServiceFee"),
  );
  const total = asMoney(
    pickField(order, "orderTotal", "OrderTotal", "totalPrice", "TotalPrice", "total", "Total"),
  );
  const subtotal =
    asMoney(pickField(order, "subTotal", "SubTotal", "itemsSubTotal", "ItemsSubTotal")) ??
    sumItemSubtotals(items);
  const buyerFullName =
    [buyer.name, shipTo?.name]
      .map((value) => value?.trim())
      .find((value) => value && value !== buyer.username) ??
    asString(pickField(order, "billToName", "BillToName")) ??
    shipTo?.name ??
    null;
  const shippedDate = shippedDateFrom(order);

  return {
    orderNumber: orderId,
    buyerFullName,
    buyerUsername: buyer.username,
    buyerUserId: buyer.userId,
    buyerEmail: buyerEmailFrom(order, buyer),
    shippedDate: shippedDate?.toISOString() ?? null,
    shipTo,
    items,
    subtotal,
    shippingType: shippingTypeFrom(order),
    shippingCost,
    taxesAndFees,
    complianceFee,
    total,
    trackingNumber: labelFromField(
      pickField(order, "trackingNumber", "TrackingNumber", "tracking", "Tracking"),
    ),
    carrier: labelFromField(pickField(order, "carrier", "Carrier", "shipCarrier", "ShipCarrier")),
  };
}

function mapSoldOrderSummary(order: unknown): MappedSoldOrder | null {
  const orderId = orderIdOf(order);
  if (!orderId) return null;

  const orderStatus = resolveOrderStatus(order);
  const items = orderItemsFrom(order);
  const itemIds = itemIdsFrom(order, items);
  const buyer = buyerSummary(order);
  const itemShipped = asBoolean(pickField(order, "itemShipped", "ItemShipped")) ?? false;
  const orderComplete =
    asBoolean(pickField(order, "orderComplete", "OrderComplete")) ?? orderStatus === 5;
  const primary = items[0];
  const title =
    primary?.title ??
    (itemIds.length > 1 ? `${itemIds.length} items` : `Order ${orderId}`);
  const details = buildOrderDetails(order, orderId, buyer);

  return {
    orderId,
    orderStatus,
    orderStatusLabel: orderStatusLabel(orderStatus),
    itemShipped,
    orderComplete,
    buyerUsername: buyer.username,
    buyerName: buyer.name,
    orderDate: parseDate(
      pickField(order, "orderDateUTC", "OrderDateUTC", "orderDate", "OrderDate"),
    ),
    totalAmount: details.total,
    itemCount: Math.max(itemIds.length, items.length, 1),
    title,
    thumbnailUrl: primary?.thumbnailUrl ?? null,
    itemIds,
    items,
    shipTo: details.shipTo,
    details,
    trackingNumber: details.trackingNumber,
    carrier: details.carrier,
  };
}

function enrichFromOrderDetail(summary: MappedSoldOrder, detail: unknown): MappedSoldOrder {
  const buyer = buyerSummary(detail);
  const details = buildOrderDetails(detail, summary.orderId, {
    username: buyer.username ?? summary.buyerUsername,
    name: buyer.name ?? summary.buyerName,
    userId: buyer.userId,
    email: buyer.email,
  });
  const items = details.items.length ? details.items : summary.items;
  const orderStatus = resolveOrderStatus(detail);
  return {
    ...summary,
    orderStatus,
    orderStatusLabel: orderStatusLabel(orderStatus),
    buyerUsername: buyer.username ?? summary.buyerUsername,
    buyerName: buyer.name ?? summary.buyerName,
    items,
    itemIds: itemIdsFrom(detail, items),
    itemCount: Math.max(summary.itemCount, items.length),
    shipTo: details.shipTo ?? summary.shipTo,
    details,
    totalAmount: details.total ?? summary.totalAmount,
    trackingNumber: details.trackingNumber ?? summary.trackingNumber,
    carrier: details.carrier ?? summary.carrier,
    title: items[0]?.title ?? summary.title,
    thumbnailUrl: items[0]?.thumbnailUrl ?? summary.thumbnailUrl,
  };
}

function parseDetailsJson(raw: string, fallback: SoldOrderDetails): SoldOrderDetails {
  try {
    const parsed = JSON.parse(raw) as SoldOrderDetails & {
      taxes?: number | null;
      fees?: number | null;
    };
    if (parsed && typeof parsed === "object" && parsed.orderNumber) {
      return {
        ...parsed,
        taxesAndFees: parsed.taxesAndFees ?? parsed.taxes ?? null,
        complianceFee: parsed.complianceFee ?? parsed.fees ?? null,
      };
    }
  } catch {
    // Fall back below.
  }
  return fallback;
}

function toCard(row: {
  id: string;
  orderId: string;
  orderStatus: number;
  orderStatusLabel: string | null;
  itemShipped: boolean;
  orderComplete: boolean;
  buyerUsername: string | null;
  buyerName: string | null;
  orderDate: Date | null;
  totalAmount: number | null;
  itemCount: number;
  title: string | null;
  thumbnailUrl: string | null;
  itemIdsJson: string;
  itemsJson: string;
  shipToJson: string;
  detailsJson: string;
  trackingNumber: string | null;
  carrier: string | null;
  shipStationOrderId: string | null;
  shipStationStatus: string | null;
  shipStationSyncedAt: Date | null;
  gunBrokerNotified: boolean;
  workStatus: string;
  lastImportedAt: Date;
  completedAt: Date | null;
}): SoldOrderCard {
  let itemIds: string[] = [];
  let items: SoldOrderLineItem[] = [];
  let shipTo: SoldOrderShipTo | null = null;
  try {
    itemIds = JSON.parse(row.itemIdsJson) as string[];
  } catch {
    itemIds = [];
  }
  try {
    items = JSON.parse(row.itemsJson) as SoldOrderLineItem[];
  } catch {
    items = [];
  }
  try {
    const parsed = JSON.parse(row.shipToJson) as SoldOrderShipTo;
    shipTo = Object.values(parsed).some(Boolean) ? parsed : null;
  } catch {
    shipTo = null;
  }

  const fallbackDetails: SoldOrderDetails = {
    orderNumber: row.orderId,
    buyerFullName: row.buyerName,
    buyerUsername: row.buyerUsername,
    buyerUserId: null,
    buyerEmail: null,
    shippedDate: null,
    shipTo,
    items,
    subtotal: sumItemSubtotals(items),
    shippingType: null,
    shippingCost: null,
    taxesAndFees: null,
    complianceFee: null,
    total: row.totalAmount,
    trackingNumber: row.trackingNumber,
    carrier: row.carrier,
  };
  const details = parseDetailsJson(row.detailsJson, fallbackDetails);
  const shippedDate =
    details?.shippedDate ??
    (row.workStatus === "complete" ? row.completedAt?.toISOString() ?? null : null);
  const orderStatus = inferOrderStatusFromFlags({
    orderStatus: row.orderStatus,
    orderComplete: row.orderComplete,
    itemShipped: row.itemShipped,
  });

  return {
    id: row.id,
    orderId: row.orderId,
    orderStatus,
    orderStatusLabel: orderStatusLabel(orderStatus),
    itemShipped: row.itemShipped,
    orderComplete: row.orderComplete,
    buyerUsername: row.buyerUsername,
    buyerName: row.buyerName,
    orderDate: row.orderDate?.toISOString() ?? null,
    totalAmount: row.totalAmount,
    itemCount: row.itemCount,
    title: row.title ?? `Order ${row.orderId}`,
    thumbnailUrl: row.thumbnailUrl,
    itemIds,
    items,
    shipTo,
    details,
    trackingNumber: row.trackingNumber ?? details?.trackingNumber ?? null,
    carrier: row.carrier ?? details?.carrier ?? null,
    shipStationOrderId: row.shipStationOrderId,
    shipStationStatus: row.shipStationStatus,
    shipStationSyncedAt: row.shipStationSyncedAt?.toISOString() ?? null,
    gunBrokerNotified: row.gunBrokerNotified,
    workStatus: row.workStatus === "complete" ? "complete" : "pending",
    lastImportedAt: row.lastImportedAt.toISOString(),
    completedAt: row.completedAt?.toISOString() ?? null,
    shippedDate,
  };
}

export async function listLocalSoldOrders(userId: string) {
  const rows = await prisma.soldOrder.findMany({
    where: { userId },
    orderBy: [{ orderDate: "desc" }, { orderId: "desc" }],
  });
  return rows.map(toCard);
}

export async function setSoldOrderWorkStatus(
  userId: string,
  orderId: string,
  workStatus: "pending" | "complete",
) {
  const row = await prisma.soldOrder.findUnique({
    where: { userId_orderId: { userId, orderId } },
  });
  if (!row) {
    throw new Error("Order not found.");
  }
  await prisma.soldOrder.update({
    where: { userId_orderId: { userId, orderId } },
    data: {
      workStatus,
      completedAt: workStatus === "complete" ? new Date() : null,
    },
  });
}

const DETAIL_BATCH_SIZE = 5;

export async function importGunBrokerSoldOrders(
  userId: string,
  onProgress?: ImportProgressHandler,
) {
  if (!(await isGunBrokerConnected(userId))) {
    throw new Error("Connect GunBroker in Settings before syncing sold orders.");
  }

  const orders: MappedSoldOrder[] = [];
  await withGunBrokerAccess(userId, async (accessToken) => {
    let pageIndex = 1;
    const pageSize = 300;
    while (true) {
      const page = await listOrdersSold(accessToken, pageIndex, pageSize);
      for (const order of page.results) {
        const mapped = mapSoldOrderSummary(order);
        if (mapped) orders.push(mapped);
      }
      await reportImportProgress(onProgress, {
        loaded: orders.length,
        total: page.count > 0 ? page.count : null,
        phase: "loading",
      });
      if (page.results.length < pageSize || orders.length >= page.count) break;
      pageIndex += 1;
      if (pageIndex > 50) break;
    }

    for (let index = 0; index < orders.length; index += DETAIL_BATCH_SIZE) {
      const batch = orders.slice(index, index + DETAIL_BATCH_SIZE);
      await Promise.all(
        batch.map(async (order, offset) => {
          try {
            const detail = await getOrder(accessToken, order.orderId);
            orders[index + offset] = enrichFromOrderDetail(order, detail);
          } catch {
            // Summary data is enough if detail fetch fails.
          }
        }),
      );
      await reportImportProgress(onProgress, {
        loaded: Math.min(index + batch.length, orders.length),
        total: orders.length,
        phase: "loading",
      });
    }
  });

  const now = new Date();
  await reportImportProgress(onProgress, {
    loaded: orders.length,
    total: orders.length,
    phase: "saving",
  });

  for (const [index, order] of orders.entries()) {
    const existing = await prisma.soldOrder.findUnique({
      where: { userId_orderId: { userId, orderId: order.orderId } },
      select: {
        workStatus: true,
        trackingNumber: true,
        carrier: true,
        detailsJson: true,
      },
    });
    const gbNotified = gunBrokerBuyerNotified({
      orderComplete: order.orderComplete,
      orderStatus: order.orderStatus,
    });
    const terminal = [6, 12, 13].includes(order.orderStatus);

    let workStatus =
      existing?.workStatus ??
      defaultWorkStatus({ orderStatus: order.orderStatus });

    if (terminal || gbNotified) {
      workStatus = "complete";
    } else {
      workStatus = "pending";
    }

    const workStatusChanged = existing?.workStatus !== workStatus;
    const trackingNumber =
      order.trackingNumber ?? existing?.trackingNumber ?? null;
    const carrier = order.carrier ?? existing?.carrier ?? null;
    const previousDetails = existing
      ? parseDetailsJson(existing.detailsJson, order.details)
      : order.details;
    const details = {
      ...order.details,
      trackingNumber: order.details.trackingNumber ?? trackingNumber,
      carrier: order.details.carrier ?? carrier,
      shippedDate: order.details.shippedDate ?? previousDetails.shippedDate,
    };

    await prisma.soldOrder.upsert({
      where: { userId_orderId: { userId, orderId: order.orderId } },
      create: {
        userId,
        orderId: order.orderId,
        orderStatus: order.orderStatus,
        orderStatusLabel: order.orderStatusLabel,
        itemShipped: order.itemShipped,
        orderComplete: order.orderComplete,
        buyerUsername: order.buyerUsername,
        buyerName: order.buyerName,
        orderDate: order.orderDate,
        totalAmount: order.totalAmount,
        itemCount: order.itemCount,
        title: order.title,
        thumbnailUrl: order.thumbnailUrl,
        itemIdsJson: JSON.stringify(order.itemIds),
        itemsJson: JSON.stringify(order.items),
        shipToJson: JSON.stringify(order.shipTo ?? {}),
        detailsJson: JSON.stringify(order.details),
        trackingNumber: order.trackingNumber,
        carrier: order.carrier,
        gunBrokerNotified: gbNotified,
        workStatus,
        completedAt: workStatus === "complete" ? now : null,
        lastImportedAt: now,
      },
      update: {
        orderStatus: order.orderStatus,
        orderStatusLabel: order.orderStatusLabel,
        itemShipped: order.itemShipped,
        orderComplete: order.orderComplete,
        buyerUsername: order.buyerUsername,
        buyerName: order.buyerName,
        orderDate: order.orderDate,
        totalAmount: order.totalAmount,
        itemCount: order.itemCount,
        title: order.title,
        thumbnailUrl: order.thumbnailUrl,
        itemIdsJson: JSON.stringify(order.itemIds),
        itemsJson: JSON.stringify(order.items),
        shipToJson: JSON.stringify(order.shipTo ?? {}),
        detailsJson: JSON.stringify(details),
        trackingNumber,
        carrier,
        gunBrokerNotified: gbNotified,
        ...(workStatusChanged
          ? {
              workStatus,
              completedAt: workStatus === "complete" ? now : null,
            }
          : {}),
        lastImportedAt: now,
      },
    });
    await reportSaveProgress(onProgress, index, orders.length);
  }

  await markIntegrationSynced(userId, "gunbroker");
  return { count: orders.length };
}
