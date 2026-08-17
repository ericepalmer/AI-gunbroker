"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import { importInventoryAction } from "@/app/app/inventory/actions";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function ImportInventoryButton({ connected }: { connected: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onImport() {
    startTransition(async () => {
      const result = await importInventoryAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      toast.success(
        result.count === 1
          ? "Imported 1 listing from GunBroker."
          : `Imported ${result.count} listings from GunBroker.`,
      );
      router.refresh();
    });
  }

  return (
    <Button type="button" onClick={onImport} disabled={pending || !connected}>
      {pending ? "Importing…" : "Import from GunBroker"}
    </Button>
  );
}
