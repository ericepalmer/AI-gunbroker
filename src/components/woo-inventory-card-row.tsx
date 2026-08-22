"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  previewWooGunBrokerLinkAction,
  setWooSourceAction,
} from "@/app/app/inventory/woo-actions";
import type { WooGunBrokerLinkPreview, WooProductCard } from "@/lib/woocommerce/types";
import { isLinkableWooKind } from "@/lib/woocommerce/classify";
import { ConfirmLinkWooToGunBrokerDialog } from "@/components/confirm-link-woo-to-gunbroker-dialog";
import { SendingOverlay } from "@/components/sending-overlay";
import { WooInventoryCard } from "@/components/woo-inventory-card";
import { WooLinkCheckbox } from "@/components/woo-link-column";

export function WooInventoryCardRow({ product }: { product: WooProductCard }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [preview, setPreview] = useState<WooGunBrokerLinkPreview | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const linkable = isLinkableWooKind(product.kind);

  function setLinked(linked: boolean) {
    if (!linked) return;
    startTransition(async () => {
      const result = await previewWooGunBrokerLinkAction(product.productId);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (result.preview.alreadyLinked) {
        const linkedResult = await setWooSourceAction(product.productId, true);
        if (!linkedResult.ok) {
          toast.error(linkedResult.error);
          return;
        }
        toast.success("Already linked on GunBroker.");
        router.refresh();
        return;
      }
      setPreview(result.preview);
      setConfirmOpen(true);
    });
  }

  function confirmLink() {
    if (pending) return;
    startTransition(async () => {
      const result = await setWooSourceAction(product.productId, true);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setConfirmOpen(false);
      setPreview(null);
      toast.success(
        result.alreadyLinked
          ? "Already linked on GunBroker."
          : `Sent to GunBroker${result.itemId ? ` (Item ${result.itemId})` : ""}.`,
      );
      router.refresh();
    });
  }

  return (
    <div className="flex w-full min-w-0 items-stretch gap-2">
      <SendingOverlay
        open={pending && !confirmOpen}
        title={confirmOpen ? "Listing on GunBroker" : "Preparing listing preview"}
        detail={product.name}
      />
      <ConfirmLinkWooToGunBrokerDialog
        open={confirmOpen}
        preview={preview}
        pending={pending}
        onCancel={() => {
          if (pending) return;
          setConfirmOpen(false);
          setPreview(null);
        }}
        onConfirm={confirmLink}
      />
      <WooLinkCheckbox
        checked={product.sourceForGunBroker}
        disabled={pending || product.sourceForGunBroker || !linkable}
        productName={product.name}
        linkBlockedReason={
          linkable
            ? undefined
            : "Other items cannot be linked to GunBroker."
        }
        onChange={setLinked}
      />
      <WooInventoryCard product={product} context="woocommerce" />
    </div>
  );
}
