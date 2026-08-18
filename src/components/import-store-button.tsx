"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { importWooProductsAction } from "@/app/app/store/actions";
import { Button } from "@/components/ui/button";

export function ImportStoreButton({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onImport() {
    startTransition(async () => {
      const result = await importWooProductsAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.count === 1
          ? "Imported 1 product from WooCommerce."
          : `Imported ${result.count} products from WooCommerce.`,
      );
      router.refresh();
    });
  }

  return (
    <Button type="button" onClick={onImport} disabled={pending || !connected}>
      {pending ? "Importing…" : "Import from WooCommerce"}
    </Button>
  );
}
