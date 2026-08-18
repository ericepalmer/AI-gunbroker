"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { formatFeeUsd, type ListingFeeSummary } from "@/lib/gunbroker/fees";

export function ConfirmFeesDialog({
  open,
  title,
  description,
  summary,
  confirmLabel,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  description: string;
  summary: ListingFeeSummary;
  confirmLabel: string;
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
        aria-label="Cancel"
        className="absolute inset-0 bg-black/60"
        disabled={pending}
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-fees-title"
        className="relative w-full max-w-md rounded-2xl border border-border bg-card p-5 shadow-xl"
      >
        <h2 id="confirm-fees-title" className="text-lg font-medium">
          {title}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        {summary.lines.length ? (
          <ul className="mt-4 space-y-2 text-sm">
            {summary.lines.map((line) => (
              <li key={line.label} className="flex items-start justify-between gap-4">
                <span>{line.label}</span>
                <span className="shrink-0 tabular-nums">{formatFeeUsd(line.amount)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm">No extra listing fees.</p>
        )}
        <p className="mt-4 flex items-center justify-between border-t border-border pt-3 text-sm font-medium">
          <span>Total increase</span>
          <span className="tabular-nums">{formatFeeUsd(summary.total)}</span>
        </p>
        <div className="mt-5 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={pending}
          >
            Cancel
          </Button>
          <Button type="button" onClick={onConfirm} disabled={pending}>
            {pending ? "Working…" : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
