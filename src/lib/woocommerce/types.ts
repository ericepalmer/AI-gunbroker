import type { WooAttributeEntry, WooGunBrokerFields } from "@/lib/woocommerce/attributes";

export type WooCommerceSecrets = {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
};

export type WooCommerceStatus = {
  status: "disconnected" | "connected" | "error";
  storeUrl: string | null;
  hasCredentials: boolean;
  lastVerifiedAt: string | null;
  lastError: string | null;
  productCount: number;
};

export type QuantitySource = "woocommerce" | "gunbroker" | "manual";

export type WooKind =
  | "ammo"
  | "brass"
  | "rifles"
  | "shotguns"
  | "pistols"
  | "revolvers"
  | "suppressors"
  | "other";

export type { WooAttributeEntry, WooGunBrokerFields };

export type LinkedListingSummary = {
  itemId: string;
  title: string;
  quantity: number;
  price: number | null;
  thumbnailUrl: string | null;
  endingAt: string | null;
};

export type WooProductCard = {
  productId: number;
  parentId: number;
  name: string;
  permalink: string | null;
  sku: string | null;
  upc: string | null;
  type: string;
  status: string;
  stockStatus: string;
  price: number | null;
  stockQuantity: number | null;
  thumbnailUrl: string | null;
  categories: string[];
  kind: WooKind;
  sourceForGunBroker: boolean;
  linkedItemId: string | null;
  linkedListing: LinkedListingSummary | null;
  quantitySource: QuantitySource;
  manualQuantity: number | null;
  listedOnStore: boolean;
  lastImportedAt: string;
};

export type WooProductDetail = WooProductCard & {
  slug: string | null;
  regularPrice: number | null;
  description: string | null;
  manufacturer: string | null;
  caliber: string | null;
  rounds: number | null;
  model: string | null;
  mount: string | null;
  condition: number | null;
  gtin: string | null;
  mfgPartNumber: string | null;
  serialNumber: string | null;
  attributes: WooAttributeEntry[];
  gunBrokerFields: WooGunBrokerFields;
};

export type LinkableListing = {
  itemId: string;
  title: string;
  sku: string | null;
  quantity: number;
};

export type WooLinkFieldSource = "woocommerce" | "template" | "chamber" | "blank";

export type WooLinkPreviewField = {
  key: string;
  label: string;
  value: string;
  source: WooLinkFieldSource;
  /** Template value when source is Woo/blank but template had something (for disclosure). */
  templateValue?: string | null;
};

export type WooGunBrokerLinkPreview = {
  productId: number;
  productName: string;
  alreadyLinked: boolean;
  linkedItemId: string | null;
  kind: WooKind;
  /** Product/catalog fields (prefer WooCommerce). */
  productFields: WooLinkPreviewField[];
  /** Posting mechanics taken from the GunBroker template. */
  templateFields: WooLinkPreviewField[];
  warnings: string[];
};

export function effectiveQuantity(product: WooProductCard) {
  if (product.quantitySource === "manual") return product.manualQuantity;
  if (product.quantitySource === "gunbroker") {
    return product.linkedListing?.quantity ?? product.stockQuantity;
  }
  return product.stockQuantity;
}

function moneyEqual(a: number | null, b: number | null) {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return Math.abs(a - b) < 0.005;
}

export function quantityMismatch(product: WooProductCard) {
  if (!product.linkedListing) return false;
  const wooQty = product.stockQuantity;
  const gbQty = product.linkedListing.quantity;
  if (wooQty == null) return false;
  return wooQty !== gbQty;
}

export function priceMismatch(product: WooProductCard) {
  if (!product.linkedListing) return false;
  return !moneyEqual(product.price, product.linkedListing.price);
}

/** Qty or price differs between WooCommerce and the linked GunBroker listing. */
export function linkedDiscrepancy(product: WooProductCard) {
  return quantityMismatch(product) || priceMismatch(product);
}

export function listingWooQuantityMismatch(
  listingQuantity: number,
  wooStockQuantity: number | null,
) {
  if (wooStockQuantity == null) return false;
  return listingQuantity !== wooStockQuantity;
}

export function listingWooPriceMismatch(
  listingPrice: number | null,
  wooPrice: number | null,
) {
  return !moneyEqual(listingPrice, wooPrice);
}

export function listingWooDiscrepancy(
  listing: { quantity: number; price: number | null },
  product: Pick<WooProductCard, "stockQuantity" | "price">,
) {
  return (
    listingWooQuantityMismatch(listing.quantity, product.stockQuantity) ||
    listingWooPriceMismatch(listing.price, product.price)
  );
}

export class WooCommerceApiError extends Error {
  status: number;
  userMessage: string;

  constructor(status: number, userMessage: string) {
    super(userMessage);
    this.name = "WooCommerceApiError";
    this.status = status;
    this.userMessage = userMessage;
  }
}
