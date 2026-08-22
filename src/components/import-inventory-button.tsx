"use client";

import { ImportProgressButton } from "@/components/import-progress-button";

export function ImportInventoryButton({
  connected,
  idleLabel = "Import from GunBroker",
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
      endpoint="/api/inventory/import/gunbroker"
      idleLabel={idleLabel}
      sourceName="GunBroker"
      noun="listing"
      lastSyncedAt={lastSyncedAt}
      connectHref={connectHref}
    />
  );
}
