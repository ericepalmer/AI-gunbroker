"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { unlinkWooListingAction } from "@/app/app/inventory/woo-actions";
import type { WooProductCard } from "@/lib/woocommerce/types";
import { effectiveQuantity } from "@/lib/woocommerce/types";
import { InventoryCardShell } from "@/components/inventory-card-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  INVENTORY_COMPACT_PRICE_INPUT_CLASS,
  INVENTORY_COMPACT_QTY_INPUT_CLASS,
} from "@/lib/inventory-layout";
import { wooProductDetailPath } from "@/lib/inventory-paths";
import { LINKED_CARD_CLASS, WOO_STORE_CARD_CLASS } from "@/lib/inventory-source";

export function WooInventoryCard({
  product,
  context = "woocommerce",
}: {
  product: WooProductCard;
  context?: "woocommerce" | "gunbroker";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const linked = product.sourceForGunBroker || context === "gunbroker";
  const serverQty = effectiveQuantity(product);
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(serverQty == null ? "" : String(serverQty));
  const [price, setPrice] = useState(product.price == null ? "" : String(product.price));
  const detailHref = wooProductDetailPath(product.productId);
  const listingHref = product.linkedListing
    ? `/app/inventory/${product.linkedListing.itemId}`
    : undefined;
  const href = context === "woocommerce" ? detailHref : listingHref ?? detailHref;

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

  function removeFromGunBroker() {
    startTransition(async () => {
      const result = await unlinkWooListingAction(
        product.productId,
        product.linkedItemId ? "delete-gunbroker" : "make-independent",
      );
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Removed from GunBroker inventory.");
      router.refresh();
    });
  }

  return (
    <InventoryCardShell
      className={linked ? LINKED_CARD_CLASS : WOO_STORE_CARD_CLASS}
      thumbnailUrl={product.thumbnailUrl}
      title={product.name}
      href={href}
      editing={editing}
      pending={pending}
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
              disabled={pending}
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
              disabled={pending}
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
          ) : context === "gunbroker" ? (
            <span>Not listed on GunBroker</span>
          ) : null}
          {context === "gunbroker" ? (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="h-5 px-1 text-[10px] text-muted-foreground"
              disabled={pending}
              onClick={removeFromGunBroker}
            >
              {pending ? "Removing…" : "Remove from GunBroker"}
            </Button>
          ) : null}
        </>
      }
    />
  );
}
