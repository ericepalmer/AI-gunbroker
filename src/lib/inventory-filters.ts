import type { InventoryTabItem } from "@/components/inventory-grid";
import type { WooKind } from "@/lib/woocommerce/types";
import { classifyWooProduct, matchesWooKeyword } from "@/lib/woocommerce/classify";

export const INVENTORY_KIND_FILTERS: { id: "all" | WooKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ammo", label: "Ammo" },
  { id: "brass", label: "Brass" },
  { id: "primers", label: "Primers" },
  { id: "projectiles", label: "Projectiles" },
  { id: "powder", label: "Powder" },
  { id: "firearms", label: "Firearms" },
  { id: "accessories", label: "Accessories" },
];

export type InventoryKindFilterId = (typeof INVENTORY_KIND_FILTERS)[number]["id"];

export function isInventoryKindFilterId(value: string): value is InventoryKindFilterId {
  return INVENTORY_KIND_FILTERS.some((filter) => filter.id === value);
}

export function inventoryItemKind(item: InventoryTabItem): WooKind {
  if (item.kind === "woo" || item.kind === "linked") {
    return item.product.kind;
  }
  return classifyWooProduct(item.listing.title, []);
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
