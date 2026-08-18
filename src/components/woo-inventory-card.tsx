"use client";

import { useEffect, useState } from "react";
import type { WooProductCard } from "@/lib/woocommerce/types";
import { effectiveQuantity } from "@/lib/woocommerce/types";
import { InventoryCardShell } from "@/components/inventory-card-shell";
import { Input } from "@/components/ui/input";
import {
  INVENTORY_COMPACT_PRICE_INPUT_CLASS,
  INVENTORY_COMPACT_QTY_INPUT_CLASS,
} from "@/lib/inventory-layout";
import { LINKED_CARD_CLASS, WOO_STORE_CARD_CLASS } from "@/lib/inventory-source";

export function WooInventoryCard({
  product,
  context = "woocommerce",
}: {
  product: WooProductCard;
  context?: "woocommerce" | "gunbroker";
}) {
  const linked = product.sourceForGunBroker || context === "gunbroker";
  const serverQty = effectiveQuantity(product);
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(serverQty == null ? "" : String(serverQty));
  const [price, setPrice] = useState(product.price == null ? "" : String(product.price));

  useEffect(() => {
    const nextQty = effectiveQuantity(product);
    setQuantity(nextQty == null ? "" : String(nextQty));
    setPrice(product.price == null ? "" : String(product.price));
    setEditing(false);
  }, [product.productId, product.price, product.stockQuantity, product.manualQuantity]);

  function resetFields() {
    const nextQty = effectiveQuantity(product);
    setQuantity(nextQty == null ? "" : String(nextQty));
    setPrice(product.price == null ? "" : String(product.price));
    setEditing(false);
  }

  return (
    <InventoryCardShell
      className={linked ? LINKED_CARD_CLASS : WOO_STORE_CARD_CLASS}
      thumbnailUrl={product.thumbnailUrl}
      title={product.name}
      editing={editing}
      onCommit={() => setEditing(false)}
      onDiscard={resetFields}
      qtyPrice={
        <>
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            Qty
            <Input
              type="number"
              min={0}
              step={1}
              value={quantity}
              onFocus={() => setEditing(true)}
              onChange={(event) => {
                setEditing(true);
                setQuantity(event.target.value);
              }}
              className={INVENTORY_COMPACT_QTY_INPUT_CLASS}
            />
          </label>
          <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
            $
            <Input
              type="number"
              min={0}
              step="0.01"
              value={price}
              onFocus={() => setEditing(true)}
              onChange={(event) => {
                setEditing(true);
                setPrice(event.target.value);
              }}
              className={INVENTORY_COMPACT_PRICE_INPUT_CLASS}
            />
          </label>
        </>
      }
      metadata={
        <>
          {product.categories.length ? (
            <span className="line-clamp-1">{product.categories.join(", ")}</span>
          ) : null}
          <span className="truncate">{product.sku ?? "—"}</span>
          {product.linkedListing ? (
            <span className="line-clamp-1">{product.linkedListing.title}</span>
          ) : null}
        </>
      }
    />
  );
}
