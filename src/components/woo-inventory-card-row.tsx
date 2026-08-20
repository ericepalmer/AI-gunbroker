"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setWooSourceAction } from "@/app/app/inventory/woo-actions";
import type { WooProductCard } from "@/lib/woocommerce/types";
import { SendingOverlay } from "@/components/sending-overlay";
import { WooInventoryCard } from "@/components/woo-inventory-card";
import { WooLinkCheckbox } from "@/components/woo-link-column";

export function WooInventoryCardRow({ product }: { product: WooProductCard }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLinked(linked: boolean) {
    if (!linked) return;
    startTransition(async () => {
      const result = await setWooSourceAction(product.productId, linked);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (linked) {
        toast.success(
          result.alreadyLinked
            ? "Already linked on GunBroker."
            : `Sent to GunBroker${result.itemId ? ` (Item ${result.itemId})` : ""}.`,
        );
      }
      router.refresh();
    });
  }

  return (
    <div className="flex w-full min-w-0 items-stretch gap-2">
      <SendingOverlay
        open={pending}
        title="Sending to GunBroker"
        detail={product.name}
      />
      <WooLinkCheckbox
        checked={product.sourceForGunBroker}
        disabled={pending || product.sourceForGunBroker}
        productName={product.name}
        onChange={setLinked}
      />
      <WooInventoryCard product={product} context="woocommerce" />
    </div>
  );
}
