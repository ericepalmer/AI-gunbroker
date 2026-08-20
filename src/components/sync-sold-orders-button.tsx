"use client";

import { ImportProgressButton } from "@/components/import-progress-button";

export function SyncSoldOrdersButton({
  connected,
  lastSyncedAt,
}: {
  connected: boolean;
  lastSyncedAt: string | null;
}) {
  return (
    <ImportProgressButton
      connected={connected}
      endpoint="/api/orders/import/gunbroker"
      idleLabel="Sync from GunBroker"
      sourceName="GunBroker"
      noun="order"
      lastSyncedAt={lastSyncedAt}
    />
  );
}
