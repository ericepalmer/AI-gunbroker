"use client";

import { Info } from "lucide-react";

const LINK_TOOLTIP =
  "When linked, this product appears on your GunBroker inventory so you can list it there and keep quantities in sync.";

export const WOO_LINK_COLUMN_CLASS = "flex w-10 shrink-0 flex-col items-center justify-center";

export function WooLinkColumnHeader() {
  return (
    <div className={WOO_LINK_COLUMN_CLASS}>
      <div className="flex items-center gap-0.5 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
        <span>Link</span>
        <span className="group relative">
          <button
            type="button"
            className="rounded-sm text-muted-foreground hover:text-foreground"
            aria-label="What linking does"
          >
            <Info className="size-3" aria-hidden />
          </button>
          <span
            role="tooltip"
            className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-1.5 hidden w-52 -translate-x-1/2 rounded-md border border-border bg-card px-2 py-1.5 text-left text-[11px] font-normal normal-case tracking-normal text-foreground shadow-lg group-hover:block group-focus-within:block"
          >
            {LINK_TOOLTIP}
          </span>
        </span>
      </div>
    </div>
  );
}

export function WooLinkCheckbox({
  checked,
  disabled,
  onChange,
  productName,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  productName: string;
}) {
  return (
    <div className={WOO_LINK_COLUMN_CLASS}>
      <input
        type="checkbox"
        className="size-3.5 accent-[var(--accent)]"
        checked={checked}
        disabled={disabled}
        aria-label={`Link ${productName} to GunBroker inventory`}
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}
