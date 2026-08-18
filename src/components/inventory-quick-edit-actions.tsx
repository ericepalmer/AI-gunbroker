"use client";

import { Button } from "@/components/ui/button";

export function InventoryQuickEditActions({
  pending,
  onCommit,
  onDiscard,
}: {
  pending?: boolean;
  onCommit: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        size="sm"
        className="h-6 px-2 text-[10px]"
        onClick={onCommit}
        disabled={pending}
      >
        {pending ? "…" : "Commit"}
      </Button>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="h-6 px-2 text-[10px]"
        onClick={onDiscard}
        disabled={pending}
      >
        Discard
      </Button>
    </div>
  );
}
