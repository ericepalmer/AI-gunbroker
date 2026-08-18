"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

type BreakLinkChoice = "delete-gunbroker" | "make-independent";

export function ConfirmBreakLinkDialog({
  open,
  productName,
  listingTitle,
  pending,
  onCancel,
  onChoose,
}: {
  open: boolean;
  productName: string;
  listingTitle: string;
  pending?: boolean;
  onCancel: () => void;
  onChoose: (choice: BreakLinkChoice) => void;
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
        aria-labelledby="break-link-title"
        className="relative z-10 w-full max-w-md rounded-xl border border-border bg-card p-5 shadow-xl"
      >
        <h2 id="break-link-title" className="font-serif text-xl tracking-tight">
          Break WooCommerce link?
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Are you sure you want to break the link between Woo and GunBroker for{" "}
          <span className="text-foreground">{productName}</span> and{" "}
          <span className="text-foreground">{listingTitle}</span>?
        </p>
        <div className="mt-5 flex flex-wrap justify-end gap-2">
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => onChoose("delete-gunbroker")}
          >
            {pending ? "Working…" : "Delete GunBroker entry"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => onChoose("make-independent")}
          >
            {pending ? "Working…" : "Convert to independent"}
          </Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>
            Nevermind
          </Button>
        </div>
      </div>
    </div>
  );
}
