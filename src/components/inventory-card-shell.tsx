import { InventoryThumbnail } from "@/components/inventory-thumbnail";
import { InventoryQuickEditActions } from "@/components/inventory-quick-edit-actions";
import {
  INVENTORY_CARD_BODY_CLASS,
  INVENTORY_CARD_MAIN_CLASS,
  INVENTORY_CARD_SECOND_ROW_CLASS,
} from "@/lib/inventory-layout";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

export function InventoryCardShell({
  thumbnailUrl,
  title,
  editing,
  pending,
  onCommit,
  onDiscard,
  onOpen,
  qtyPrice,
  metadata,
  footer,
  className,
}: {
  thumbnailUrl: string | null;
  title: string;
  editing?: boolean;
  pending?: boolean;
  onCommit?: () => void;
  onDiscard?: () => void;
  onOpen?: () => void;
  qtyPrice: ReactNode;
  metadata: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "w-full min-w-0 overflow-hidden rounded-lg border text-xs",
        onOpen && "cursor-pointer",
        className,
      )}
      onClick={(event) => {
        if (!onOpen) return;
        const target = event.target as HTMLElement;
        if (target.closest("a, button, input, label, textarea, select")) return;
        onOpen();
      }}
    >
      <div className={INVENTORY_CARD_BODY_CLASS}>
        <InventoryThumbnail url={thumbnailUrl} />
        <div className={INVENTORY_CARD_MAIN_CLASS}>
          <h2 className="w-full truncate text-sm font-medium leading-tight" title={title}>
            {title}
          </h2>
          <div className={INVENTORY_CARD_SECOND_ROW_CLASS}>
            <div className="flex shrink-0 items-center gap-2">{qtyPrice}</div>
            <div className="min-w-0 flex-1 text-right text-[10px] leading-snug text-muted-foreground">
              {editing && onCommit && onDiscard ? (
                <div className="flex h-full items-center justify-end">
                  <InventoryQuickEditActions
                    pending={pending}
                    onCommit={onCommit}
                    onDiscard={onDiscard}
                  />
                </div>
              ) : (
                <div className="flex flex-col items-end justify-center gap-0.5">{metadata}</div>
              )}
            </div>
          </div>
        </div>
      </div>
      {footer ? (
        <div className="flex flex-wrap items-center gap-1 border-t border-border/70 px-2 py-1">
          {footer}
        </div>
      ) : null}
    </article>
  );
}
