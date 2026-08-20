import { GUNBROKER_PROVIDER } from "@/lib/gunbroker/config";
import { prisma } from "@/lib/prisma";

export async function markIntegrationSynced(userId: string, provider: string) {
  await prisma.integration.updateMany({
    where: { userId, provider },
    data: { lastSyncedAt: new Date() },
  });
}

export async function getIntegrationLastSyncedAt(userId: string, provider: string) {
  const row = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider } },
    select: { lastSyncedAt: true },
  });
  if (row?.lastSyncedAt) return row.lastSyncedAt.toISOString();
  if (provider === GUNBROKER_PROVIDER) {
    const latest = await prisma.soldOrder.aggregate({
      where: { userId },
      _max: { lastImportedAt: true },
    });
    return latest._max.lastImportedAt?.toISOString() ?? null;
  }
  return null;
}
