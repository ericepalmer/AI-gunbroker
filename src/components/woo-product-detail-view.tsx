"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { ExternalLink, Store } from "lucide-react";
import { pushWooToGunBrokerAction } from "@/app/app/inventory/woo-actions";
import type { WooProductDetail } from "@/lib/woocommerce/types";
import { effectiveQuantity } from "@/lib/woocommerce/types";
import { conditionLabel } from "@/lib/gunbroker/types";
import { isLinkableWooKind, wooKindLabel } from "@/lib/woocommerce/classify";
import { ConfirmPushWooToGunBrokerDialog } from "@/components/confirm-push-woo-to-gunbroker-dialog";
import { InventoryThumbnail } from "@/components/inventory-thumbnail";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { WOOCOMMERCE_INVENTORY_PATH } from "@/lib/inventory-paths";

function Field({
  label,
  value,
  mono,
}: {
  label: string;
  value: string | number | null | undefined;
  mono?: boolean;
}) {
  const text =
    value == null || value === ""
      ? "—"
      : typeof value === "number"
        ? value.toLocaleString()
        : value;
  return (
    <div className="space-y-1">
      <Label className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </Label>
      <p className={`text-sm ${mono ? "font-mono text-xs" : ""}`}>{text}</p>
    </div>
  );
}

function stripHtml(value: string | null) {
  if (!value) return "";
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function WooProductDetailView({ product }: { product: WooProductDetail }) {
  const router = useRouter();
  const qty = effectiveQuantity(product);
  const [confirmPush, setConfirmPush] = useState(false);
  const [pending, startTransition] = useTransition();

  function onPushConfirm() {
    if (pending) return;
    startTransition(async () => {
      const result = await pushWooToGunBrokerAction(product.productId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirmPush(false);
      toast.success(`Pushed changes to GunBroker item ${result.itemId}.`);
      router.refresh();
    });
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => router.push(WOOCOMMERCE_INVENTORY_PATH)}
        >
          Back to WooCommerce inventory
        </Button>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="accent" className="gap-1">
            <Store className="size-3" />
            WooCommerce
          </Badge>
          {product.sourceForGunBroker ? (
            <Badge tone="default">GunBroker source</Badge>
          ) : null}
          {product.linkedListing ? (
            <>
              <Link
                href={`/app/inventory/${product.linkedListing.itemId}`}
                className="text-xs text-accent underline-offset-4 hover:underline"
              >
                Linked GB item {product.linkedListing.itemId}
              </Link>
              <Button
                type="button"
                size="sm"
                disabled={pending}
                onClick={() => setConfirmPush(true)}
              >
                Push changes to GunBroker
              </Button>
            </>
          ) : null}
          {product.permalink ? (
            <a
              href={product.permalink}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent underline-offset-4 hover:underline"
            >
              View in store
              <ExternalLink className="size-3" />
            </a>
          ) : null}
        </div>
      </div>

      {product.linkedListing ? (
        <p className="mb-4 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
          Pushing to GunBroker overwrites GunBroker values for any field WooCommerce also has.
        </p>
      ) : null}

      <div className="rounded-xl border border-border bg-card p-5">
        <div className="flex flex-wrap items-start gap-4">
          <InventoryThumbnail url={product.thumbnailUrl} />
          <div className="min-w-0 flex-1 space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-accent">WooCommerce product</p>
            <h1 className="font-serif text-2xl tracking-tight">{product.name}</h1>
            <p className="text-xs text-muted-foreground">
              Product #{product.productId}
              {product.parentId > 0 ? ` · variation of #${product.parentId}` : ""}
              {" · "}
              Last imported {new Date(product.lastImportedAt).toLocaleString()}
            </p>
          </div>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Field label="SKU" value={product.sku} mono />
          <Field label="UPC" value={product.upc} mono />
          <Field label="GTIN" value={product.gtin} mono />
          <Field label="Type" value={product.type} />
          <Field label="Status" value={product.status} />
          <Field label="Stock status" value={product.stockStatus} />
          <Field label="Price" value={product.price == null ? null : `$${product.price.toFixed(2)}`} />
          <Field
            label="Regular price"
            value={product.regularPrice == null ? null : `$${product.regularPrice.toFixed(2)}`}
          />
          <Field label="Stock quantity" value={product.stockQuantity} />
          <Field label="Effective quantity" value={qty} />
          <Field label="Category kind" value={wooKindLabel(product.kind)} />
          <Field label="Categories" value={product.categories.join(", ") || null} />
        </section>

        {!isLinkableWooKind(product.kind) && !product.linkedListing ? (
          <p className="mt-4 rounded-md border border-border bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            Other items cannot be linked or sent to GunBroker. Assign a supported WooCommerce
            category (rifles, shotguns, pistols, revolvers, suppressors, ammo, or brass) to link
            this product.
          </p>
        ) : null}

        <section className="mt-8 space-y-3">
          <h2 className="text-sm font-medium">Description</h2>
          <div className="rounded-lg border border-border/70 bg-muted/20 p-3 text-sm leading-relaxed whitespace-pre-wrap">
            {stripHtml(product.description) || "—"}
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <div>
            <h2 className="text-sm font-medium">GunBroker fields from WooCommerce</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Mapped from WooCommerce attributes. Number is cartridges in one box (one listing unit).
              Description is used only when Number is missing.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Manufacturer" value={product.gunBrokerFields.manufacturer} />
            <Field label="Model" value={product.gunBrokerFields.model} />
            <Field label="Caliber" value={product.gunBrokerFields.caliber} />
            <Field label="Factory condition" value={conditionLabel(product.gunBrokerFields.condition)} />
            <Field label="Mount" value={product.gunBrokerFields.mount} />
            <Field label="Cartridges per box" value={product.gunBrokerFields.rounds} />
            <Field label="Mfg part number" value={product.gunBrokerFields.mfgPartNumber} mono />
            <Field label="Serial number" value={product.gunBrokerFields.serialNumber} mono />
            <Field label="UPC (mapped)" value={product.gunBrokerFields.upc} mono />
            <Field label="GTIN (mapped)" value={product.gunBrokerFields.gtin} mono />
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <div>
            <h2 className="text-sm font-medium">Stored item details</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              Values saved locally from the last WooCommerce import.
            </p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="Manufacturer" value={product.manufacturer} />
            <Field label="Model" value={product.model} />
            <Field label="Caliber" value={product.caliber} />
            <Field label="Factory condition" value={conditionLabel(product.condition)} />
            <Field label="Mount" value={product.mount} />
            <Field label="Cartridges per box" value={product.rounds} />
            <Field label="Mfg part number" value={product.mfgPartNumber} mono />
            <Field label="Serial number" value={product.serialNumber} mono />
          </div>
        </section>

        <section className="mt-8 space-y-3">
          <div>
            <h2 className="text-sm font-medium">WooCommerce attributes</h2>
            <p className="mt-1 text-xs text-muted-foreground">
              All product attributes and relevant meta fields from WooCommerce.
            </p>
          </div>
          {product.attributes.length ? (
            <div className="overflow-hidden rounded-lg border border-border/70">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/30 text-xs uppercase tracking-[0.12em] text-muted-foreground">
                  <tr>
                    <th className="px-3 py-2 font-medium">Attribute</th>
                    <th className="px-3 py-2 font-medium">Slug</th>
                    <th className="px-3 py-2 font-medium">Value</th>
                  </tr>
                </thead>
                <tbody>
                  {product.attributes.map((attribute) => (
                    <tr
                      key={`${attribute.slug ?? attribute.name}:${attribute.value}`}
                      className="border-t border-border/60"
                    >
                      <td className="px-3 py-2">{attribute.name}</td>
                      <td className="px-3 py-2 font-mono text-xs text-muted-foreground">
                        {attribute.slug ?? "—"}
                      </td>
                      <td className="px-3 py-2">{attribute.value}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No attributes stored for this product.</p>
          )}
        </section>
      </div>

      {product.linkedListing ? (
        <ConfirmPushWooToGunBrokerDialog
          open={confirmPush}
          productName={product.name}
          listingTitle={product.linkedListing.title}
          pending={pending}
          onCancel={() => setConfirmPush(false)}
          onConfirm={onPushConfirm}
        />
      ) : null}
    </div>
  );
}
