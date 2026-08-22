import type { ListingCard } from "@/lib/gunbroker/types";
import type { WooProductCard } from "@/lib/woocommerce/types";
import { listingWooDiscrepancy } from "@/lib/woocommerce/types";
import { InventoryCard } from "@/components/inventory-card";
import { WooInventoryCard } from "@/components/woo-inventory-card";
import { INVENTORY_GRID_CLASS, INVENTORY_GRID_ITEM_CLASS } from "@/lib/inventory-layout";
import {
  InventorySectionBreak,
  InventorySectionHeading,
} from "@/components/inventory-section-heading";

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

  const discrepancies = items.filter(
    (item) =>
      item.kind === "linked" && listingWooDiscrepancy(item.listing, item.product),
  );
  const linked = items.filter((item) => {
    if (item.kind === "woo") return true;
    if (item.kind !== "linked") return false;
    return !listingWooDiscrepancy(item.listing, item.product);
  });
  const independent = items.filter((item) => item.kind === "listing");

  const sections = [
    { title: "Linked with discrepancies", items: discrepancies, keyBase: "discrepancy" },
    { title: "Linked", items: linked, keyBase: "linked" },
    { title: "Independent", items: independent, keyBase: "independent" },
  ].filter((section) => section.items.length > 0);

  return (
    <div className={INVENTORY_GRID_CLASS}>
      {sections.flatMap((section, index) => {
        const nodes = [
          index === 0 ? (
            <InventorySectionHeading key={`${section.keyBase}-heading`}>
              {section.title}
            </InventorySectionHeading>
          ) : (
            <InventorySectionBreak key={`${section.keyBase}-heading`} title={section.title} />
          ),
          ...section.items.map(renderItem),
        ];
        if (index < sections.length - 1) {
          nodes.push(...sectionGapFillers(section.items.length, section.keyBase));
        }
        return nodes;
      })}
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
