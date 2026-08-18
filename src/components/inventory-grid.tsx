import type { ListingCard } from "@/lib/gunbroker/types";
import type { WooProductCard } from "@/lib/woocommerce/types";
import { InventoryCard } from "@/components/inventory-card";
import { WooInventoryCard } from "@/components/woo-inventory-card";
import { INVENTORY_GRID_CLASS, INVENTORY_GRID_ITEM_CLASS } from "@/lib/inventory-layout";
import {
  InventorySectionBreak,
  InventorySectionHeading,
} from "@/components/inventory-section-heading";
import { isWooSourcedItem } from "@/lib/inventory-source";

export type InventoryTabItem =
  | { key: string; kind: "listing"; listing: ListingCard }
  | { key: string; kind: "woo"; product: WooProductCard }
  | { key: string; kind: "linked"; listing: ListingCard; product: WooProductCard };

function renderItem(item: InventoryTabItem) {
  if (item.kind === "woo") {
    return (
      <div key={item.key} className={INVENTORY_GRID_ITEM_CLASS}>
        <WooInventoryCard product={item.product} context="gunbroker" />
      </div>
    );
  }
  if (item.kind === "linked") {
    return (
      <div key={item.key} className={INVENTORY_GRID_ITEM_CLASS}>
        <InventoryCard listing={item.listing} woo={item.product} showBreakLink />
      </div>
    );
  }
  return (
    <div key={item.key} className={INVENTORY_GRID_ITEM_CLASS}>
      <InventoryCard listing={item.listing} />
    </div>
  );
}

function sectionGapFillers(count: number, keyBase: string) {
  const fillers = [];
  if (count % 2 === 1) {
    fillers.push(
      <div
        key={`${keyBase}-sm`}
        className={`${INVENTORY_GRID_ITEM_CLASS} invisible pointer-events-none hidden sm:flex xl:hidden`}
        aria-hidden
      />,
    );
  }
  const remainder = count % 3;
  const xlNeeded = remainder === 0 ? 0 : 3 - remainder;
  for (let i = 0; i < xlNeeded; i += 1) {
    fillers.push(
      <div
        key={`${keyBase}-xl-${i}`}
        className={`${INVENTORY_GRID_ITEM_CLASS} invisible pointer-events-none hidden xl:flex`}
        aria-hidden
      />,
    );
  }
  return fillers;
}

export function InventoryGrid({
  items,
  emptyMessage,
}: {
  items: InventoryTabItem[];
  emptyMessage: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
        {emptyMessage}
      </div>
    );
  }

  const wooSourced = items.filter(isWooSourcedItem);
  const independent = items.filter((item) => item.kind === "listing");
  const showSectionBreak = wooSourced.length > 0 && independent.length > 0;

  return (
    <div className={INVENTORY_GRID_CLASS}>
      {wooSourced.length > 0 ? (
        <InventorySectionHeading>WooCommerce linked</InventorySectionHeading>
      ) : null}
      {wooSourced.map(renderItem)}
      {showSectionBreak ? sectionGapFillers(wooSourced.length, "woo-linked") : null}
      {showSectionBreak ? <InventorySectionBreak title="Independent" /> : null}
      {independent.length > 0 && wooSourced.length === 0 ? (
        <InventorySectionHeading>Independent</InventorySectionHeading>
      ) : null}
      {independent.map(renderItem)}
    </div>
  );
}

export function gunBrokerTabItems(
  listings: ListingCard[],
  products: WooProductCard[],
): InventoryTabItem[] {
  const consumed = new Set<string>();
  const items: InventoryTabItem[] = [];

  for (const product of products.filter((row) => row.sourceForGunBroker)) {
    const listing = product.linkedListing
      ? listings.find((row) => row.itemId === product.linkedListing?.itemId)
      : null;
    if (listing) {
      items.push({
        key: `linked-${product.productId}-${listing.itemId}`,
        kind: "linked",
        listing,
        product,
      });
      consumed.add(listing.itemId);
    } else {
      items.push({ key: `woo-${product.productId}`, kind: "woo", product });
    }
  }

  for (const listing of listings) {
    if (consumed.has(listing.itemId)) continue;
    items.push({ key: `gb-${listing.itemId}`, kind: "listing", listing });
  }

  return items;
}
