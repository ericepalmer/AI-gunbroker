"use client";

import { useMemo, useState } from "react";
import type { InventoryTabItem } from "@/components/inventory-grid";
import { InventoryGrid } from "@/components/inventory-grid";
import { ShowZeroInventory } from "@/components/show-zero-inventory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  INVENTORY_KIND_FILTERS,
  matchesInventoryKeyword,
  matchesInventoryKindFilter,
} from "@/lib/inventory-filters";
import type { WooKind } from "@/lib/woocommerce/types";
import { effectiveQuantity } from "@/lib/woocommerce/types";

function itemInStock(item: InventoryTabItem) {
  if (item.kind === "listing") return item.listing.quantity > 0;
  if (item.kind === "linked") {
    const qty = effectiveQuantity(item.product);
    if (qty != null) return qty > 0;
    return item.listing.quantity > 0;
  }
  const qty = effectiveQuantity(item.product);
  if (qty != null) return qty > 0;
  return item.product.stockStatus !== "outofstock";
}

export function GunBrokerInventoryView({
  items,
  emptyMessage,
}: {
  items: InventoryTabItem[];
  emptyMessage: string;
}) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<(typeof INVENTORY_KIND_FILTERS)[number]["id"]>("all");
  const [showZero, setShowZero] = useState(false);

  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      if (!showZero && !itemInStock(item)) return false;
      if (!matchesInventoryKindFilter(item, kind)) return false;
      return matchesInventoryKeyword(item, query);
    });
  }, [items, showZero, kind, query]);

  const filteredCount = useMemo(() => {
    return items.filter((item) => {
      if (!matchesInventoryKindFilter(item, kind)) return false;
      return matchesInventoryKeyword(item, query);
    }).length;
  }, [items, kind, query]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {INVENTORY_KIND_FILTERS.map((filter) => (
            <Button
              key={filter.id}
              type="button"
              size="sm"
              variant={kind === filter.id ? "default" : "secondary"}
              className="h-7 px-2 text-xs"
              onClick={() => setKind(filter.id)}
            >
              {filter.label}
            </Button>
          ))}
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Title or SKU"
            className="h-7 max-w-[180px] px-2 text-xs"
          />
        </div>
        <ShowZeroInventory checked={showZero} onChange={setShowZero} />
      </div>
      <InventoryGrid
        items={visibleItems}
        emptyMessage={
          filteredCount === 0 && items.length > 0
            ? "No listings match that filter."
            : !showZero && items.length > 0 && visibleItems.length === 0
              ? "Everything is at 0. Check “Show 0 inventory” to see those items."
              : emptyMessage
        }
      />
    </div>
  );
}
