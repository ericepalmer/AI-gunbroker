"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { setWooSourceAction } from "@/app/app/inventory/woo-actions";
import type { WooProductCard } from "@/lib/woocommerce/types";
import { WooInventoryCard } from "@/components/woo-inventory-card";
import { WooLinkCheckbox } from "@/components/woo-link-column";

export function WooInventoryCardRow({ product }: { product: WooProductCard }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function setLinked(linked: boolean) {
    const loadingId = linked
      ? toast.loading(`Sending “${product.name}” to GunBroker…`)
      : undefined;

    startTransition(async () => {
      const result = await setWooSourceAction(product.productId, linked);
      if (!result.ok) {
        if (loadingId != null) toast.error(result.error, { id: loadingId });
        else toast.error(result.error);
        return;
      }
      if (linked) {
        toast.success(
          result.alreadyLinked
            ? "Already linked on GunBroker."
            : `Sent to GunBroker${result.itemId ? ` (Item ${result.itemId})` : ""}.`,
          { id: loadingId },
        );
      } else {
        toast.success("Removed from GunBroker inventory.");
      }
      router.refresh();
    });
  }

  return (
    <div className="flex w-full min-w-0 items-stretch gap-2">
      <WooLinkCheckbox
        checked={product.sourceForGunBroker}
        disabled={pending}
        productName={product.name}
        onChange={setLinked}
      />
      <WooInventoryCard product={product} context="woocommerce" />
    </div>
  );
}
