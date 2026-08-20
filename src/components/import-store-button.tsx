"use client";

import { ImportProgressButton } from "@/components/import-progress-button";

export function ImportStoreButton({ connected }: { connected: boolean }) {
  return (
    <ImportProgressButton
      connected={connected}
      endpoint="/api/inventory/import/woocommerce"
      idleLabel="Import from WooCommerce"
      sourceName="WooCommerce"
      noun="product"
    />
  );
}
