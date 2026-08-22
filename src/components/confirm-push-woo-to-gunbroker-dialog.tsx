"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export function ConfirmPushWooToGunBrokerDialog({
  open,
  productName,
  listingTitle,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  productName: string;
  listingTitle: string;
  pending?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) onCancel();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, pending, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-black/60"
        onClick={() => {
          if (!pending) onCancel();
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="push-woo-gb-title"
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
      >
        <h2 id="push-woo-gb-title" className="font-serif text-xl tracking-tight">
          Push changes to GunBroker?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Chamber will copy WooCommerce values from{" "}
          <span className="text-foreground">{productName}</span> onto{" "}
          <span className="text-foreground">{listingTitle}</span>.
        </p>
        <p className="mt-3 rounded-md border border-border bg-muted/30 px-3 py-2 text-sm text-foreground">
          Warning: values already set on GunBroker will be overwritten for any field
          WooCommerce also has (title, description, SKU, UPC, quantity, price, manufacturer,
          caliber, cartridges per box, and related catalog fields).
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={onConfirm}>
            {pending ? "Pushing…" : "Push changes"}
          </Button>
        </div>
      </div>
    </div>
  );
}
