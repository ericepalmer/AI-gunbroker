"use client";

import { ImportProgressButton } from "@/components/import-progress-button";

export function ImportStoreButton({
  connected,
  idleLabel = "Import from WooCommerce",
  lastSyncedAt,
  connectHref,
}: {
  connected: boolean;
  idleLabel?: string;
  lastSyncedAt?: string | null;
  connectHref?: string;
}) {
  return (
    <ImportProgressButton
      connected={connected}
      endpoint="/api/inventory/import/woocommerce"
      idleLabel={idleLabel}
      sourceName="WooCommerce"
      noun="product"
      lastSyncedAt={lastSyncedAt}
      connectHref={connectHref}
    />
  );
}
