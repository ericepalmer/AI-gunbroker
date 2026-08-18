import type { InventoryTabItem } from "@/components/inventory-grid";

/** GunBroker accent styling — used for linked / GB inventory items. */
export const LINKED_CARD_CLASS =
  "border-accent/35 bg-[color-mix(in_srgb,var(--accent)_7%,var(--card))]";

/** Default WooCommerce store styling. */
export const WOO_STORE_CARD_CLASS =
  "border-[color-mix(in_srgb,var(--woo)_40%,var(--border))] bg-[color-mix(in_srgb,var(--woo)_9%,var(--card))]";

export function isWooSourcedItem(item: InventoryTabItem) {
  return item.kind === "woo" || item.kind === "linked";
}
