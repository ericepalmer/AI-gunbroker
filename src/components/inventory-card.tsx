"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  cloneListingAction,
  commitListingQuickAction,
  deleteListingAction,
} from "@/app/app/inventory/actions";
import type { ListingCard } from "@/lib/gunbroker/types";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatDate(value: string | null) {
  if (!value) return "No end date";
  return new Date(value).toLocaleString();
}

function parseMoney(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const next = Number(trimmed);
  return Number.isFinite(next) ? next : null;
}

export function InventoryCard({ listing }: { listing: ListingCard }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const [quantity, setQuantity] = useState(String(listing.quantity));
  const [price, setPrice] = useState(listing.price == null ? "" : String(listing.price));
  const href = `/app/inventory/${listing.itemId}`;

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

  function onClone() {
    startTransition(async () => {
      const result = await cloneListingAction(listing.itemId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Listing cloned.");
      router.push(`/app/inventory/${result.itemId}`);
    });
  }

  function onDelete() {
    const confirmed = window.confirm(
      `Delete “${listing.title}” from GunBroker? This cannot be undone.`,
    );
    if (!confirmed) return;
    startTransition(async () => {
      const result = await deleteListingAction(listing.itemId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success("Listing deleted.");
      router.refresh();
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

  return (
    <article className="overflow-hidden rounded-2xl border border-border bg-card">
      <div className="flex gap-3 p-3">
        <div className="size-24 shrink-0 overflow-hidden rounded-lg bg-muted">
          {listing.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={listing.thumbnailUrl}
              alt=""
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-muted-foreground">
              No photo
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2 py-0.5">
          <h2 className="line-clamp-2 font-medium leading-snug">{listing.title}</h2>
          <p className="text-sm text-muted-foreground">{formatDate(listing.endingAt)}</p>
          <div className="flex items-center gap-2">
            <label className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
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
                className="h-8 w-16 px-2"
              />
            </label>
            <label className="flex min-w-0 items-center gap-1 text-xs text-muted-foreground">
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
                className="h-8 w-24 px-2"
              />
            </label>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border px-3 py-2">
        {editing ? (
          <>
            <Button type="button" size="sm" onClick={onCommit} disabled={pending}>
              {pending ? "Sending…" : "Commit"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={resetFields}
              disabled={pending}
            >
              Discard
            </Button>
          </>
        ) : (
          <>
            <Link
              href={href}
              className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
            >
              Edit
            </Link>
            <Button type="button" variant="secondary" size="sm" onClick={onClone} disabled={pending}>
              Clone
            </Button>
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={onDelete}
              disabled={pending}
            >
              Delete
            </Button>
          </>
        )}
      </div>
    </article>
  );
}
