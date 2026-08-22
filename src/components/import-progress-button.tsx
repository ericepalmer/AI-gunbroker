"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatImportProgress, type ImportProgress } from "@/lib/import-progress";
import { runImportStream } from "@/lib/run-import-stream";
import { formatElapsedSince } from "@/lib/sold-order-dates";
import { cn } from "@/lib/utils";

export function ImportProgressButton({
  connected,
  endpoint,
  idleLabel,
  sourceName,
  noun,
  lastSyncedAt = null,
  connectHref,
}: {
  connected: boolean;
  endpoint: string;
  idleLabel: string;
  sourceName: string;
  noun: string;
  lastSyncedAt?: string | null;
  connectHref?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [progress, setProgress] = useState<ImportProgress | null>(null);

  async function onImport() {
    if (pending) return;
    setPending(true);
    setProgress(null);
    const toastId = toast.loading("Importing…");

    try {
      const result = await runImportStream(endpoint, (next) => {
        setProgress(next);
        toast.loading(formatImportProgress(next), { id: toastId });
      });
      if (!result.ok) {
        toast.error(result.error, { id: toastId });
        return;
      }
      toast.success(
        result.count === 1
          ? `Imported 1 ${noun} from ${sourceName}.`
          : `Imported ${result.count} ${noun}s from ${sourceName}.`,
        { id: toastId },
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not import.",
        { id: toastId },
      );
    } finally {
      setPending(false);
      setProgress(null);
    }
  }

  const shellClass = cn(
    "h-auto flex-col gap-0.5 py-1.5 leading-tight",
    buttonVariants({ variant: "default" }),
  );

  if (!connected && connectHref) {
    return (
      <Link href={connectHref} className={shellClass}>
        <span>{`Connect ${sourceName}`}</span>
        <span className="text-[10px] font-normal opacity-80">Not connected</span>
      </Link>
    );
  }

  return (
    <Button
      type="button"
      onClick={onImport}
      disabled={pending || !connected}
      className={cn("h-auto flex-col gap-0.5 py-1.5 leading-tight")}
    >
      <span>{pending ? (progress ? formatImportProgress(progress) : "Importing…") : idleLabel}</span>
      <span className="text-[10px] font-normal opacity-80">
        {formatElapsedSince(lastSyncedAt)}
      </span>
    </Button>
  );
}
