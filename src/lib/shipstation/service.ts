import { decryptSecret, encryptSecret } from "@/lib/crypto";
import { pingShipStation } from "@/lib/shipstation/client";
import { SHIPSTATION_PROVIDER } from "@/lib/shipstation/config";
import { prisma } from "@/lib/prisma";
import {
  ShipStationApiError,
  type ShipStationSecrets,
  type ShipStationStatus,
} from "@/lib/shipstation/types";

function readSecrets(cipher: string | null | undefined): ShipStationSecrets | null {
  if (!cipher) return null;
  try {
    const parsed = JSON.parse(decryptSecret(cipher)) as ShipStationSecrets;
    if (!parsed?.apiKey || !parsed?.apiSecret) return null;
    return parsed;
  } catch {
    return null;
  }
}

function explainShipStationError(error: unknown) {
  if (error instanceof ShipStationApiError) return error.userMessage;
  if (error instanceof Error) return error.message;
  return "Could not connect to ShipStation.";
}

async function credentialsFor(userId: string) {
  const row = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: SHIPSTATION_PROVIDER } },
  });
  const secrets = readSecrets(row?.secretsCipher ?? null);
  if (!row || !secrets?.apiKey || !secrets.apiSecret) {
    throw new Error("Connect ShipStation in Settings before sending orders.");
  }
  return { row, secrets };
}

export async function getShipStationStatus(userId: string): Promise<ShipStationStatus> {
  const row = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: SHIPSTATION_PROVIDER } },
  });
  const secrets = readSecrets(row?.secretsCipher ?? null);
  return {
    status: (row?.status as ShipStationStatus["status"]) ?? "disconnected",
    hasCredentials: Boolean(secrets?.apiKey && secrets.apiSecret),
    lastVerifiedAt: row?.lastVerifiedAt?.toISOString() ?? null,
    lastError: row?.lastError ?? null,
  };
}

export async function isShipStationConnected(userId: string) {
  const row = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: SHIPSTATION_PROVIDER } },
    select: { status: true, secretsCipher: true },
  });
  if (!row?.secretsCipher || row.status === "disconnected") return false;
  const secrets = readSecrets(row.secretsCipher);
  return Boolean(secrets?.apiKey && secrets.apiSecret);
}

export async function connectShipStationAccount(
  userId: string,
  input: { apiKey: string; apiSecret: string },
) {
  const apiKey = input.apiKey.trim();
  const apiSecret = input.apiSecret.trim();
  if (!apiKey || !apiSecret) {
    throw new Error("API key and secret are required.");
  }

  const secrets: ShipStationSecrets = { apiKey, apiSecret };

  try {
    await pingShipStation(secrets);
    await prisma.integration.upsert({
      where: { userId_provider: { userId, provider: SHIPSTATION_PROVIDER } },
      create: {
        userId,
        provider: SHIPSTATION_PROVIDER,
        status: "connected",
        secretsCipher: encryptSecret(JSON.stringify(secrets)),
        lastError: null,
        lastVerifiedAt: new Date(),
      },
      update: {
        status: "connected",
        secretsCipher: encryptSecret(JSON.stringify(secrets)),
        lastError: null,
        lastVerifiedAt: new Date(),
      },
    });
  } catch (error) {
    const message = explainShipStationError(error);
    await prisma.integration.upsert({
      where: { userId_provider: { userId, provider: SHIPSTATION_PROVIDER } },
      create: {
        userId,
        provider: SHIPSTATION_PROVIDER,
        status: "error",
        secretsCipher: encryptSecret(JSON.stringify(secrets)),
        lastError: message,
        lastVerifiedAt: null,
      },
      update: {
        status: "error",
        secretsCipher: encryptSecret(JSON.stringify(secrets)),
        lastError: message,
        lastVerifiedAt: null,
      },
    });
    throw new Error(message);
  }
}

export async function testShipStationAccount(userId: string) {
  const { secrets } = await credentialsFor(userId);
  try {
    await pingShipStation(secrets);
    await prisma.integration.update({
      where: { userId_provider: { userId, provider: SHIPSTATION_PROVIDER } },
      data: {
        status: "connected",
        lastError: null,
        lastVerifiedAt: new Date(),
      },
    });
  } catch (error) {
    const message = explainShipStationError(error);
    await prisma.integration.update({
      where: { userId_provider: { userId, provider: SHIPSTATION_PROVIDER } },
      data: { status: "error", lastError: message },
    });
    throw new Error(message);
  }
}

export async function disconnectShipStationAccount(userId: string) {
  await prisma.integration.updateMany({
    where: { userId, provider: SHIPSTATION_PROVIDER },
    data: {
      status: "disconnected",
      secretsCipher: null,
      lastError: null,
      lastVerifiedAt: null,
    },
  });
}

export async function withShipStationAccess<T>(
  userId: string,
  fn: (secrets: ShipStationSecrets) => Promise<T>,
) {
  const { secrets } = await credentialsFor(userId);
  return fn(secrets);
}
