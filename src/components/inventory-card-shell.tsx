"use client";

import Link from "next/link";
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
  href,
  editing,
  pending,
  onCommit,
  onDiscard,
  qtyPrice,
  metadata,
  footer,
  className,
}: {
  thumbnailUrl: string | null;
  title: string;
  href?: string;
  editing?: boolean;
  pending?: boolean;
  onCommit?: () => void;
  onDiscard?: () => void;
  qtyPrice: ReactNode;
  metadata: ReactNode;
  footer?: ReactNode;
  className?: string;
}) {
  return (
    <article
      className={cn(
        "relative w-full min-w-0 overflow-hidden rounded-lg border text-xs",
        href && "cursor-pointer",
        className,
      )}
    >
      {href ? (
        <Link
          href={href}
          className="absolute inset-0 z-0"
          aria-label={`Open ${title}`}
        />
      ) : null}
      <div className={cn(INVENTORY_CARD_BODY_CLASS, "pointer-events-none relative z-10")}>
        <InventoryThumbnail url={thumbnailUrl} />
        <div className={INVENTORY_CARD_MAIN_CLASS}>
          <h2 className="w-full truncate text-sm font-medium leading-tight" title={title}>
            {title}
          </h2>
          <div className={INVENTORY_CARD_SECOND_ROW_CLASS}>
            <div className="pointer-events-auto flex shrink-0 items-center gap-2">{qtyPrice}</div>
            <div className="pointer-events-auto min-w-0 flex-1 text-right text-[10px] leading-snug text-muted-foreground">
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
        <div className="relative z-10 flex flex-wrap items-center gap-1 border-t border-border/70 px-2 py-1">
          {footer}
        </div>
      ) : null}
    </article>
  );
}
