import { originFromUrl } from "@/lib/woocommerce/config";
import { reportImportProgress, type ImportProgressHandler } from "@/lib/import-progress";
import {
  collectAttributes,
  gunBrokerFieldsFromAttributes,
  mergeAttributes,
  type WooAttributeEntry,
} from "@/lib/woocommerce/attributes";
import {
  WooCommerceApiError,
  type WooCommerceSecrets,
} from "@/lib/woocommerce/types";

type RequestOptions = {
  credentials: WooCommerceSecrets;
  path: string;
  query?: Record<string, string | number | boolean | undefined | null>;
};

export type WooProductRecord = {
  productId: number;
  parentId: number;
  name: string;
  slug: string | null;
  permalink: string | null;
  sku: string | null;
  upc: string | null;
  type: string;
  status: string;
  stockStatus: string;
  price: number | null;
  regularPrice: number | null;
  stockQuantity: number | null;
  thumbnailUrl: string | null;
  description: string | null;
  manufacturer: string | null;
  caliber: string | null;
  rounds: number | null;
  gtin: string | null;
  mfgPartNumber: string | null;
  serialNumber: string | null;
  attributes: WooAttributeEntry[];
  categories: string[];
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

function asInt(value: unknown) {
  const next = asNumber(value);
  return next == null ? null : Math.trunc(next);
}

function money(value: unknown) {
  const next = asNumber(value);
  return next == null ? null : next;
}

function errorFrom(status: number, payload: unknown) {
  const record = asRecord(payload);
  const message =
    asString(record?.message) ??
    asString(record?.userMessage) ??
    `WooCommerce request failed (${status}).`;
  return new WooCommerceApiError(status, message);
}

async function parseJson(response: Response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return { message: text };
  }
}

function basicAuth(consumerKey: string, consumerSecret: string) {
  return `Basic ${Buffer.from(`${consumerKey}:${consumerSecret}`).toString("base64")}`;
}

export async function wooRequest<T = unknown>({ credentials, path, query }: RequestOptions) {
  const url = new URL(
    `${credentials.storeUrl.replace(/\/$/, "")}/wp-json/wc/v3${path.startsWith("/") ? path : `/${path}`}`,
  );
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: basicAuth(credentials.consumerKey, credentials.consumerSecret),
        "User-Agent": "Chamber/eepalmer/0.1.0/Inventory",
      },
      redirect: "manual",
      cache: "no-store",
      signal: AbortSignal.timeout(20_000),
    });
  } catch (error) {
    if (error instanceof Error && (error.name === "TimeoutError" || error.name === "AbortError")) {
      throw new WooCommerceApiError(504, "WooCommerce took too long to respond.");
    }
    throw error;
  }

  if (response.status >= 300 && response.status < 400) {
    const location = response.headers.get("location");
    if (!location) {
      throw new WooCommerceApiError(response.status, "WooCommerce redirected without a location.");
    }
    const nextOrigin = originFromUrl(location, credentials.storeUrl);
    if (nextOrigin === credentials.storeUrl) {
      throw new WooCommerceApiError(response.status, "WooCommerce redirected in a loop.");
    }
    return wooRequest<T>({
      credentials: { ...credentials, storeUrl: nextOrigin },
      path,
      query,
    });
  }

  const payload = await parseJson(response);
  if (!response.ok) {
    throw errorFrom(response.status, payload);
  }
  return {
    payload: payload as T,
    storeUrl: credentials.storeUrl,
    total: Number(response.headers.get("x-wp-total") ?? 0) || null,
    totalPages: Number(response.headers.get("x-wp-totalpages") ?? 0) || null,
  };
}

function firstImage(value: unknown) {
  if (!Array.isArray(value) || value.length === 0) return null;
  return asString(asRecord(value[0])?.src);
}

function categoriesOf(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(asRecord(item)?.name))
    .filter((name): name is string => Boolean(name));
}

function descriptionOf(record: Record<string, unknown>) {
  return (
    asString(record.description) ??
    asString(record.short_description) ??
    asString(record.shortDescription)
  );
}

function coalesceProduct(child: WooProductRecord, parent: WooProductRecord | null): WooProductRecord {
  if (!parent) return child;
  const attributes = mergeAttributes(parent.attributes, child.attributes);
  const description = child.description ?? parent.description;
  const fields = gunBrokerFieldsFromAttributes(attributes, {
    description,
    upc: child.upc ?? parent.upc,
  });
  return {
    ...child,
    permalink: child.permalink ?? parent.permalink,
    sku: child.sku ?? parent.sku,
    upc: fields.upc ?? child.upc ?? parent.upc,
    thumbnailUrl: child.thumbnailUrl ?? parent.thumbnailUrl,
    description,
    manufacturer: child.manufacturer ?? parent.manufacturer ?? fields.manufacturer,
    caliber: child.caliber ?? parent.caliber ?? fields.caliber,
    rounds: child.rounds ?? parent.rounds ?? fields.rounds,
    gtin: child.gtin ?? parent.gtin ?? fields.gtin,
    mfgPartNumber: child.mfgPartNumber ?? parent.mfgPartNumber ?? fields.mfgPartNumber,
    serialNumber: child.serialNumber ?? parent.serialNumber ?? fields.serialNumber,
    attributes,
    categories: child.categories.length ? child.categories : parent.categories,
  };
}

function mapProduct(item: unknown, fallbackParentId = 0): WooProductRecord | null {
  const record = asRecord(item);
  if (!record) return null;
  const productId = asInt(record.id);
  const name = asString(record.name);
  if (productId == null || !name) return null;
  const parentId = asInt(record.parent_id) ?? asInt(record.parentId) ?? fallbackParentId;
  const attributes = collectAttributes(record);
  const description = descriptionOf(record);
  const fields = gunBrokerFieldsFromAttributes(attributes, {
    description,
    upc: asString(record.upc),
    globalUniqueId:
      asString(record.global_unique_id) ?? asString(record.globalUniqueId),
  });
  return {
    productId,
    parentId: parentId ?? 0,
    name,
    slug: asString(record.slug),
    permalink: asString(record.permalink),
    sku: asString(record.sku),
    upc: fields.upc,
    type: asString(record.type) ?? "simple",
    status: asString(record.status) ?? "publish",
    stockStatus: asString(record.stock_status) ?? asString(record.stockStatus) ?? "instock",
    price: money(record.price),
    regularPrice: money(record.regular_price) ?? money(record.regularPrice),
    stockQuantity: asInt(record.stock_quantity) ?? asInt(record.stockQuantity),
    thumbnailUrl: firstImage(record.images),
    description,
    manufacturer: fields.manufacturer,
    caliber: fields.caliber,
    rounds: fields.rounds,
    gtin: fields.gtin,
    mfgPartNumber: fields.mfgPartNumber,
    serialNumber: fields.serialNumber,
    attributes,
    categories: categoriesOf(record.categories),
  };
}

export async function pingWooCommerce(credentials: WooCommerceSecrets) {
  const first = await wooRequest({
    credentials,
    path: "/products",
    query: { per_page: 1, status: "publish" },
  });
  return { ok: true as const, storeUrl: first.storeUrl, total: first.total ?? 0 };
}

export async function listWooProducts(
  credentials: WooCommerceSecrets,
  onProgress?: ImportProgressHandler,
) {
  const products: WooProductRecord[] = [];
  let page = 1;
  let storeUrl = credentials.storeUrl;
  let totalPages = 1;
  let catalogTotal: number | null = null;

  while (page <= totalPages && page <= 50) {
    const result = await wooRequest<unknown>({
      credentials: { ...credentials, storeUrl },
      path: "/products",
      query: { page, per_page: 100, status: "publish" },
    });
    storeUrl = result.storeUrl;
    totalPages = result.totalPages ?? 1;
    if (result.total && result.total > 0) catalogTotal = result.total;
    const rows = Array.isArray(result.payload) ? result.payload : [];
    for (const row of rows) {
      const mapped = mapProduct(row);
      if (mapped) products.push(mapped);
    }
    await reportImportProgress(onProgress, {
      loaded: products.length,
      total: catalogTotal,
      phase: "loading",
    });
    if (rows.length === 0) break;
    page += 1;
  }

  const expanded: WooProductRecord[] = [];
  for (const product of products) {
    expanded.push(product);
    if (product.type !== "variable") continue;
    let variationPage = 1;
    let variationPages = 1;
    while (variationPage <= variationPages && variationPage <= 20) {
      const result = await wooRequest<unknown>({
        credentials: { ...credentials, storeUrl },
        path: `/products/${product.productId}/variations`,
        query: { page: variationPage, per_page: 100 },
      });
      storeUrl = result.storeUrl;
      variationPages = result.totalPages ?? 1;
      const rows = Array.isArray(result.payload) ? result.payload : [];
      for (const row of rows) {
        const mapped = mapProduct(row, product.productId);
        if (!mapped) continue;
        expanded.push(
          coalesceProduct(
            {
              ...mapped,
              type: "variation",
              parentId: product.productId,
            },
            product,
          ),
        );
      }
      await reportImportProgress(onProgress, {
        loaded: expanded.length,
        total: null,
        phase: "loading",
      });
      if (rows.length === 0) break;
      variationPage += 1;
    }
  }

  return { storeUrl, products: expanded };
}

export async function getWooProduct(
  credentials: WooCommerceSecrets,
  productId: number,
  parentId = 0,
) {
  if (parentId > 0) {
    try {
      const variation = await wooRequest<unknown>({
        credentials,
        path: `/products/${parentId}/variations/${productId}`,
      });
      const mapped = mapProduct(variation.payload, parentId);
      const parentMapped = mapProduct(
        (
          await wooRequest<unknown>({
            credentials: { ...credentials, storeUrl: variation.storeUrl },
            path: `/products/${parentId}`,
          })
        ).payload,
      );
      if (!mapped) return parentMapped;
      return coalesceProduct(mapped, parentMapped);
    } catch {
      // Fall through to the simple product endpoint.
    }
  }

  const result = await wooRequest<unknown>({
    credentials,
    path: `/products/${productId}`,
  });
  return mapProduct(result.payload);
}
