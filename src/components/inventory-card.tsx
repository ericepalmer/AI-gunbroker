"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cloneListingAction, commitListingQuickAction } from "@/app/app/inventory/actions";
import { unlinkWooListingAction } from "@/app/app/inventory/woo-actions";
import type { ListingCard } from "@/lib/gunbroker/types";
import type { WooProductCard } from "@/lib/woocommerce/types";
import {
  listingWooPriceMismatch,
  listingWooQuantityMismatch,
} from "@/lib/woocommerce/types";
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
import { cn } from "@/lib/utils";

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

function formatMoney(value: number | null) {
  if (value == null) return "—";
  return value.toLocaleString(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
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
  const [quantity, setQuantity] = useState(String(listing.quantity));
  const [price, setPrice] = useState(listing.price == null ? "" : String(listing.price));
  const href = `/app/inventory/${listing.itemId}`;

  const qtyMismatch = Boolean(
    woo && listingWooQuantityMismatch(listing.quantity, woo.stockQuantity),
  );
  const priceMismatched = Boolean(
    woo && listingWooPriceMismatch(listing.price, woo.price),
  );
  const hasDiscrepancy = qtyMismatch || priceMismatched;

  useEffect(() => {
    setQuantity(String(listing.quantity));
    setPrice(listing.price == null ? "" : String(listing.price));
    setEditing(false);
  }, [listing.itemId, listing.quantity, listing.price]);

  function resetFields() {
    setQuantity(String(listing.quantity));
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
        className={cn(
          LINKED_CARD_CLASS,
          hasDiscrepancy &&
            "border-destructive/45 bg-[color-mix(in_srgb,var(--destructive)_6%,var(--card))]",
        )}
        thumbnailUrl={listing.thumbnailUrl}
        title={listing.title}
        href={href}
        editing={editing}
        pending={pending}
        onCommit={onCommit}
        onDiscard={resetFields}
        qtyPrice={
          <>
            <label className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
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
              </span>
              {qtyMismatch ? (
                <span className="leading-none text-destructive">
                  WC still {woo?.stockQuantity ?? "—"}
                </span>
              ) : null}
            </label>
            <label className="flex flex-col gap-0.5 text-[10px] text-muted-foreground">
              <span className="flex items-center gap-1">
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
              </span>
              {priceMismatched ? (
                <span className="leading-none text-destructive">
                  WC still {formatMoney(woo?.price ?? null)}
                </span>
              ) : null}
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
