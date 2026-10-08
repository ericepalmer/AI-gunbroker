"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatImportProgress, type ImportProgress } from "@/lib/import-progress";
import { formatElapsedSince } from "@/lib/sold-order-dates";
import { cn } from "@/lib/utils";

type DoneEvent = {
  type: "done";
  count: number;
  awaitingSynced: number;
  purged: number;
  tracked: number;
  delivered: number;
  withEta: number;
};

export function UpdateShipStationTrackingButton({
  connected,
  lastSyncedAt,
}: {
  connected: boolean;
  lastSyncedAt: string | null;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  async function onUpdate() {
    if (pending) return;
    setPending(true);
    setProgress(null);
    const toastId = toast.loading("Refreshing ShipStation awaiting…");

    try {
      const response = await fetch("/api/shipstation/update-tracking", { method: "POST" });
      if (!response.ok || !response.body) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Could not update tracking.");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done: DoneEvent | null = null;

      while (true) {
        const chunk = await reader.read();
        if (chunk.done) break;
        buffer += decoder.decode(chunk.value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          if (!line.trim()) continue;
          const event = JSON.parse(line) as
            | ({ type: "progress" } & ImportProgress)
            | DoneEvent
            | { type: "error"; error: string };
          if (event.type === "progress") {
            setProgress(event);
            toast.loading(formatImportProgress(event), { id: toastId });
          } else if (event.type === "error") {
            throw new Error(event.error);
          } else if (event.type === "done") {
            done = event;
          }
        }
      }

      if (!done) throw new Error("Tracking update ended without a result.");

      const parts = [
        done.awaitingSynced ? `${done.awaitingSynced} awaiting` : null,
        done.purged ? `${done.purged} shipped removed` : null,
      ].filter(Boolean);

      toast.success(
        parts.length ? `ShipStation refreshed · ${parts.join(" · ")}.` : "ShipStation desk is up to date.",
        { id: toastId },
      );
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not update tracking.", {
        id: toastId,
      });
    } finally {
      setPending(false);
      setProgress(null);
    }
  }

  if (!connected) {
    return (
      <Link
        href="/app/settings?tab=connections#connection-shipstation"
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
      disabled={pending}
      className="h-auto flex-col gap-0.5 py-1.5 leading-tight"
    >
      <span>{pending ? (progress ? formatImportProgress(progress) : "Refreshing…") : "Refresh"}</span>
      <span className="text-[10px] font-normal opacity-80">
        {formatElapsedSince(lastSyncedAt)}
      </span>
    </Button>
  );
}
