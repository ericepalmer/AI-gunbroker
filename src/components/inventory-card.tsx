"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cloneListingAction, commitListingQuickAction } from "@/app/app/inventory/actions";
import { unlinkWooListingAction } from "@/app/app/inventory/woo-actions";
import type { ListingCard } from "@/lib/gunbroker/types";
import type { WooProductCard } from "@/lib/woocommerce/types";
import { effectiveQuantity } from "@/lib/woocommerce/types";
import { InventoryCardShell } from "@/components/inventory-card-shell";
import { ConfirmBreakLinkDialog } from "@/components/confirm-break-link-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmFeesDialog } from "@/components/confirm-fees-dialog";
import { cloneListingFeeSummary } from "@/lib/gunbroker/fees";
import {
  INVENTORY_COMPACT_PRICE_INPUT_CLASS,
  INVENTORY_COMPACT_QTY_INPUT_CLASS,
} from "@/lib/inventory-layout";
import { LINKED_CARD_CLASS } from "@/lib/inventory-source";

type BreakLinkChoice = "delete-gunbroker" | "make-independent";

function formatDate(value: string | null) {
  if (!value) return "No end date";
  return new Date(value).toLocaleString(undefined, {
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function parseMoney(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : null;
}

export function InventoryCard({
  listing,
  woo,
  showBreakLink = false,
}: {
  listing: ListingCard;
  woo?: WooProductCard | null;
  showBreakLink?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [confirmClone, setConfirmClone] = useState(false);
  const [confirmBreakLink, setConfirmBreakLink] = useState(false);
  const initialQty = woo ? (effectiveQuantity(woo) ?? listing.quantity) : listing.quantity;
  const [quantity, setQuantity] = useState(String(initialQty));
  const [price, setPrice] = useState(listing.price == null ? "" : String(listing.price));
  const href = `/app/inventory/${listing.itemId}`;

  useEffect(() => {
    const nextQty = woo ? (effectiveQuantity(woo) ?? listing.quantity) : listing.quantity;
    setQuantity(String(nextQty));
    setPrice(listing.price == null ? "" : String(listing.price));
    setEditing(false);
  }, [
    listing.itemId,
    listing.quantity,
    listing.price,
    woo?.manualQuantity,
    woo?.stockQuantity,
    woo?.linkedListing?.quantity,
  ]);

  function resetFields() {
    const nextQty = woo ? (effectiveQuantity(woo) ?? listing.quantity) : listing.quantity;
    setQuantity(String(nextQty));
    setPrice(listing.price == null ? "" : String(listing.price));
    setEditing(false);
  }

  const cloneFees = cloneListingFeeSummary({
    subtitle: listing.subtitle,
    reservePrice: listing.reservePrice,
    isFixedPrice: listing.isFixedPrice,
    listingDuration: listing.listingDuration,
    premiumFeatures: listing.premiumFeatures,
  });

  function submitClone() {
    startTransition(async () => {
      const result = await cloneListingAction(listing.itemId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirmClone(false);
      toast.success("Listing cloned.");
      router.push(`/app/inventory/${result.itemId}`);
    });
  }

  function onCommit() {
    const nextQuantity = Math.max(1, Math.round(Number(quantity) || 1));
    const nextPrice = parseMoney(price);
    startTransition(async () => {
      const result = await commitListingQuickAction(listing.itemId, {
        quantity: nextQuantity,
        price: nextPrice,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setQuantity(String(nextQuantity));
      setPrice(nextPrice == null ? "" : String(nextPrice));
      setEditing(false);
      toast.success("Changes sent to GunBroker.");
      router.refresh();
    });
  }

  function breakLink(choice: BreakLinkChoice) {
    if (!woo) return;
    startTransition(async () => {
      const result = await unlinkWooListingAction(woo.productId, choice);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirmBreakLink(false);
      toast.success(
        choice === "delete-gunbroker"
          ? "Link broken and GunBroker entry deleted."
          : "Link broken. Listing is now independent.",
      );
      router.refresh();
    });
  }

  return (
    <>
      <InventoryCardShell
        className={LINKED_CARD_CLASS}
        thumbnailUrl={listing.thumbnailUrl}
        title={listing.title}
        editing={editing}
        pending={pending}
        onCommit={onCommit}
        onDiscard={resetFields}
        onOpen={() => router.push(href)}
        qtyPrice={
          <>
            <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
              Qty
              <Input
                type="number"
                min={1}
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
            <span className="truncate">{formatDate(listing.endingAt)}</span>
            {showBreakLink ? (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-5 px-1 text-[10px] text-muted-foreground"
                disabled={pending}
                onClick={() => setConfirmBreakLink(true)}
              >
                Break Woo link
              </Button>
            ) : null}
            <Button
              type="button"
              variant="secondary"
              size="sm"
              className="h-5 px-1.5 text-[10px]"
              onClick={() => setConfirmClone(true)}
              disabled={pending}
            >
              Clone
            </Button>
          </>
        }
      />
      <ConfirmFeesDialog
        open={confirmClone}
        title="Confirm clone fees"
        description="Cloning creates a new GunBroker listing. Basic insertion is free. Extra listing fees below will be charged now."
        summary={cloneFees}
        confirmLabel="Clone listing"
        pending={pending}
        onCancel={() => setConfirmClone(false)}
        onConfirm={submitClone}
      />
      {woo && showBreakLink ? (
        <ConfirmBreakLinkDialog
          open={confirmBreakLink}
          productName={woo.name}
          listingTitle={listing.title}
          pending={pending}
          onCancel={() => setConfirmBreakLink(false)}
          onChoose={breakLink}
        />
      ) : null}
    </>
  );
}
