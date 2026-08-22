import type { InventoryTabItem } from "@/components/inventory-grid";
import type { WooKind } from "@/lib/woocommerce/types";
import {
  classifyWooProduct,
  matchesWooKeyword,
  wooKindLabel,
} from "@/lib/woocommerce/classify";

export { wooKindLabel };

const INVENTORY_KIND_FILTER_DEFS: { id: "all" | WooKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ammo", label: "Ammo" },
  { id: "brass", label: "Brass" },
  { id: "rifles", label: "Rifles" },
  { id: "shotguns", label: "Shotguns" },
  { id: "pistols", label: "Pistols" },
  { id: "revolvers", label: "Revolvers" },
  { id: "suppressors", label: "Suppressors" },
  { id: "other", label: "Other" },
];

export type InventoryKindFilterId = (typeof INVENTORY_KIND_FILTER_DEFS)[number]["id"];

/** @deprecated use inventoryKindFiltersForKinds */
export const INVENTORY_KIND_FILTERS = INVENTORY_KIND_FILTER_DEFS;

export function inventoryKindFiltersForKinds(kinds: Iterable<WooKind>) {
  const present = new Set(kinds);
  return INVENTORY_KIND_FILTER_DEFS.filter(
    (filter) => filter.id === "all" || present.has(filter.id),
  );
}

export function isInventoryKindFilterId(value: string): value is InventoryKindFilterId {
  return INVENTORY_KIND_FILTER_DEFS.some((filter) => filter.id === value);
}

export function inventoryItemKind(item: InventoryTabItem): WooKind {
  if (item.kind === "woo" || item.kind === "linked") {
    return item.product.kind;
  }
  return classifyWooProduct(item.listing.title, []);
}

export function inventoryKindsFromItems(items: InventoryTabItem[]) {
  return items.map((item) => inventoryItemKind(item));
}

export function inventoryKindsFromProducts(products: { kind: WooKind }[]) {
  return products.map((product) => product.kind);
}

export function matchesInventoryKeyword(item: InventoryTabItem, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;

  if (item.kind === "listing") {
    return item.listing.title.toLowerCase().includes(needle);
  }

  if (item.kind === "linked") {
    const haystack = [
      item.listing.title,
      item.product.name,
      item.product.sku ?? "",
      ...item.product.categories,
    ]
      .join(" ")
      .toLowerCase();
    return haystack.includes(needle);
  }

  return matchesWooKeyword(item.product, query);
}

export function matchesInventoryKindFilter(item: InventoryTabItem, kind: "all" | WooKind) {
  if (kind === "all") return true;
  return inventoryItemKind(item) === kind;
}
