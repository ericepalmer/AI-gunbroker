"use client";

import { Info } from "lucide-react";

const LINK_TOOLTIP =
  "Check to review WooCommerce vs template fields, then create a GunBroker listing. Other items (powder, primers, accessories, etc.) cannot be linked. After it is linked, break the link from the GunBroker inventory page.";

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
  linkBlockedReason,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (checked: boolean) => void;
  productName: string;
  linkBlockedReason?: string;
}) {
  return (
    <div className={WOO_LINK_COLUMN_CLASS}>
      <input
        type="checkbox"
        className="size-3.5 accent-[var(--accent)] disabled:opacity-40"
        checked={checked}
        disabled={disabled}
        title={linkBlockedReason}
        aria-label={
          linkBlockedReason
            ? linkBlockedReason
            : checked
              ? `${productName} is linked. Break the link from GunBroker inventory.`
              : `Link ${productName} to GunBroker inventory`
        }
        onChange={(event) => onChange(event.target.checked)}
      />
    </div>
  );
}
