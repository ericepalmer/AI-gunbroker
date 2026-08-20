"use client";

import { useLayoutEffect, useMemo, useState } from "react";
import type { WooProductCard } from "@/lib/woocommerce/types";
import { effectiveQuantity } from "@/lib/woocommerce/types";
import { matchesWooKeyword } from "@/lib/woocommerce/classify";
import {
  INVENTORY_KIND_FILTERS,
  isInventoryKindFilterId,
  type InventoryKindFilterId,
} from "@/lib/inventory-filters";
import { ShowZeroInventory } from "@/components/show-zero-inventory";
import { WooInventoryCardRow } from "@/components/woo-inventory-card-row";
import { WooLinkColumnHeader } from "@/components/woo-link-column";
import { INVENTORY_GRID_CLASS, INVENTORY_GRID_ITEM_CLASS } from "@/lib/inventory-layout";
import {
  InventorySectionBreak,
  InventorySectionHeading,
} from "@/components/inventory-section-heading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function wooInStock(product: WooProductCard) {
  const qty = effectiveQuantity(product);
  if (qty != null) return qty > 0;
  return product.stockStatus !== "outofstock";
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

const WOO_KIND_FILTER_KEY = "chamber.woocommerce.kindFilter";

export function WooInventoryGrid({ products }: { products: WooProductCard[] }) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<InventoryKindFilterId>("all");
  const [showZero, setShowZero] = useState(false);

  useLayoutEffect(() => {
    const stored = window.localStorage.getItem(WOO_KIND_FILTER_KEY);
    if (stored && isInventoryKindFilterId(stored)) setKind(stored);
  }, []);

  function selectKind(next: InventoryKindFilterId) {
    setKind(next);
    window.localStorage.setItem(WOO_KIND_FILTER_KEY, next);
  }

  const visible = useMemo(() => {
    return products.filter((product) => {
      if (!showZero && !wooInStock(product)) return false;
      if (kind !== "all" && product.kind !== kind) return false;
      return matchesWooKeyword(product, query);
    });
  }, [products, kind, query, showZero]);

  const { linked, unlinked } = useMemo(() => {
    const linkedItems = visible.filter((product) => product.sourceForGunBroker);
    const unlinkedItems = visible.filter((product) => !product.sourceForGunBroker);
    return { linked: linkedItems, unlinked: unlinkedItems };
  }, [visible]);

  const showSectionBreak = linked.length > 0 && unlinked.length > 0;

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
              onClick={() => selectKind(filter.id)}
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
      {visible.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border bg-card p-6 text-center text-xs text-muted-foreground">
          {products.length === 0
            ? "No store products yet. Import from WooCommerce."
            : showZero
              ? "No products match that filter."
              : "Nothing in stock. Check “Show 0 inventory” to see those items."}
        </div>
      ) : (
        <div className="space-y-1">
          <div className="flex gap-2">
            <WooLinkColumnHeader />
          </div>
          <div className={INVENTORY_GRID_CLASS}>
            {linked.length > 0 ? (
              <InventorySectionHeading>Linked to GunBroker</InventorySectionHeading>
            ) : null}
            {linked.map((product) => (
              <div key={product.productId} className={INVENTORY_GRID_ITEM_CLASS}>
                <WooInventoryCardRow product={product} />
              </div>
            ))}
            {showSectionBreak ? sectionGapFillers(linked.length, "woo-linked") : null}
            {showSectionBreak ? <InventorySectionBreak title="Not linked" /> : null}
            {unlinked.length > 0 && linked.length === 0 ? (
              <InventorySectionHeading>Not linked</InventorySectionHeading>
            ) : null}
            {unlinked.map((product) => (
              <div key={product.productId} className={INVENTORY_GRID_ITEM_CLASS}>
                <WooInventoryCardRow product={product} />
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
