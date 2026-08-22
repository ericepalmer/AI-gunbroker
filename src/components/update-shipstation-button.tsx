"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateSoldOrdersFromShipStationAction } from "@/app/app/sold/actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatElapsedSince } from "@/lib/sold-order-dates";
import { cn } from "@/lib/utils";

export function UpdateShipStationButton({
  connected,
  lastSyncedAt,
  idleLabel = "Update ShipStation",
  connectHref,
}: {
  connected: boolean;
  lastSyncedAt: string | null;
  idleLabel?: string;
  connectHref?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onUpdate() {
    if (pending) return;
    startTransition(async () => {
      const result = await updateSoldOrdersFromShipStationAction();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const { checked, shipped } = result.result;
      if (checked === 0) {
        toast.message("No open orders to check on ShipStation.");
      } else if (shipped > 0) {
        toast.success(
          shipped === 1
            ? `Updated ${checked} order · 1 marked shipped.`
            : `Updated ${checked} orders · ${shipped} marked shipped.`,
        );
      } else {
        toast.message(
          checked === 1
            ? "Checked 1 order on ShipStation. None newly shipped."
            : `Checked ${checked} orders on ShipStation. None newly shipped.`,
        );
      }
      router.refresh();
    });
  }

  if (!connected && connectHref) {
    return (
      <Link
        href={connectHref}
        className={cn(
          buttonVariants({ variant: "default" }),
          "h-auto flex-col gap-0.5 py-1.5 leading-tight",
        )}
      >
        <span>Connect ShipStation</span>
        <span className="text-[10px] font-normal opacity-80">Not connected</span>
      </Link>
    );
  }

  return (
    <Button
      type="button"
      onClick={onUpdate}
      disabled={pending || !connected}
      className="h-auto flex-col gap-0.5 py-1.5 leading-tight"
    >
      <span>{pending ? "Updating…" : idleLabel}</span>
      <span className="text-[10px] font-normal opacity-80">
        {formatElapsedSince(lastSyncedAt)}
      </span>
    </Button>
  );
}
