"use client";

import { ImportProgressButton } from "@/components/import-progress-button";

export function ImportInventoryButton({ connected }: { connected: boolean }) {
  return (
    <ImportProgressButton
      connected={connected}
      endpoint="/api/inventory/import/gunbroker"
      idleLabel="Import from GunBroker"
      sourceName="GunBroker"
      noun="listing"
    />
  );
}
