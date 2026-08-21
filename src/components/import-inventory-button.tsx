"use client";

import { ImportProgressButton } from "@/components/import-progress-button";

export function ImportInventoryButton({
  connected,
  idleLabel = "Import from GunBroker",
  lastSyncedAt,
}: {
  connected: boolean;
  idleLabel?: string;
  lastSyncedAt?: string | null;
}) {
  return (
    <ImportProgressButton
      connected={connected}
      endpoint="/api/inventory/import/gunbroker"
      idleLabel={idleLabel}
      sourceName="GunBroker"
      noun="listing"
      lastSyncedAt={lastSyncedAt}
    />
  );
}
