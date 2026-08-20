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
  | "primers"
  | "projectiles"
  | "powder"
  | "firearms"
  | "accessories"
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

export function effectiveQuantity(product: WooProductCard) {
  if (product.quantitySource === "manual") return product.manualQuantity;
  if (product.quantitySource === "gunbroker") {
    return product.linkedListing?.quantity ?? product.stockQuantity;
  }
  return product.stockQuantity;
}

export function quantityMismatch(product: WooProductCard) {
  if (!product.linkedListing) return false;
  const wooQty = product.stockQuantity;
  const gbQty = product.linkedListing.quantity;
  if (wooQty == null) return false;
  return wooQty !== gbQty;
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
