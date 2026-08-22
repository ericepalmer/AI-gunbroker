"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import type {
  WooGunBrokerLinkPreview,
  WooLinkFieldSource,
  WooLinkPreviewField,
} from "@/lib/woocommerce/types";

function sourceLabel(source: WooLinkFieldSource) {
  switch (source) {
    case "woocommerce":
      return "WooCommerce";
    case "template":
      return "Template";
    case "chamber":
      return "Chamber";
    case "blank":
      return "Blank";
  }
}

function sourceClass(source: WooLinkFieldSource) {
  switch (source) {
    case "woocommerce":
      return "text-accent";
    case "template":
      return "text-amber-700 dark:text-amber-400";
    case "chamber":
      return "text-foreground";
    case "blank":
      return "text-muted-foreground";
  }
}

function FieldRows({ fields }: { fields: WooLinkPreviewField[] }) {
  return (
    <div className="overflow-hidden rounded-lg border border-border">
      <table className="w-full text-left text-sm">
        <thead className="bg-muted/40 text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
          <tr>
            <th className="px-3 py-2 font-medium">Field</th>
            <th className="px-3 py-2 font-medium">Value</th>
            <th className="px-3 py-2 font-medium">Source</th>
          </tr>
        </thead>
        <tbody>
          {fields.map((field) => (
            <tr key={field.key} className="border-t border-border/80">
              <td className="px-3 py-2 align-top text-muted-foreground">{field.label}</td>
              <td className="px-3 py-2 align-top">
                <span className="break-words">{field.value}</span>
                {field.source === "blank" &&
                field.templateValue &&
                field.templateValue !== "—" ? (
                  <span className="mt-1 block text-[11px] text-muted-foreground">
                    Template has {field.templateValue} (not used)
                  </span>
                ) : null}
              </td>
              <td className={`px-3 py-2 align-top text-xs ${sourceClass(field.source)}`}>
                {sourceLabel(field.source)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ConfirmLinkWooToGunBrokerDialog({
  open,
  preview,
  pending,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  preview: WooGunBrokerLinkPreview | null;
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

  if (!open || !preview) return null;

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
        aria-labelledby="link-woo-gb-title"
        className="relative z-10 flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-xl"
      >
        <div className="border-b border-border px-5 py-4">
          <h2 id="link-woo-gb-title" className="font-serif text-xl tracking-tight">
            Review before listing on GunBroker
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Product fields come from WooCommerce when present. Category and GunBroker category come
            from WC categories / Category kind. Shipping, payment, duration, and other posting
            options come from your <span className="text-foreground">Defaults</span>.
          </p>
        </div>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-4">
          {preview.warnings.length ? (
            <ul className="space-y-2 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-foreground">
              {preview.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              From WooCommerce / Chamber
            </h3>
            <FieldRows fields={preview.productFields} />
          </section>

          <section className="space-y-2">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
              Defaults
            </h3>
            <FieldRows fields={preview.templateFields} />
          </section>
        </div>

        <div className="flex flex-wrap justify-end gap-2 border-t border-border px-5 py-4">
          <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" disabled={pending} onClick={onConfirm}>
            {pending ? "Listing…" : "Create GunBroker listing"}
          </Button>
        </div>
      </div>
    </div>
  );
}
