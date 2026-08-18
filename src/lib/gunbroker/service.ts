import { decryptSecret, encryptSecret } from "@/lib/crypto";
import {
  GUNBROKER_PROVIDER,
  gunBrokerDefaultUsername,
  gunBrokerDevKey,
  gunBrokerEnvironment,
} from "@/lib/gunbroker/config";
import {
  createAccessToken,
  deleteAccessToken,
  getAccountInfo,
  pingGunBroker,
} from "@/lib/gunbroker/client";
import { GunBrokerApiError, type GunBrokerSecrets, type GunBrokerStatus } from "@/lib/gunbroker/types";
import { prisma } from "@/lib/prisma";

export type { GunBrokerStatus };

function readSecrets(cipher: string | null): GunBrokerSecrets | null {
  if (!cipher) return null;
  return JSON.parse(decryptSecret(cipher)) as GunBrokerSecrets;
}

function explainGunBrokerError(error: unknown) {
  const raw =
    error instanceof GunBrokerApiError
      ? error.userMessage
      : error instanceof Error
        ? error.message
        : "Could not connect to GunBroker.";

  if (/unapproved user parameter/i.test(raw)) {
    return gunBrokerEnvironment() === "sandbox"
      ? "Sandbox rejected this API key. Confirm GUNBROKER_SANDBOX_DEVKEY, then email api@gunbroker.com if it still fails."
      : "GunBroker rejected this login for the configured API key. The key may need your current IP whitelisted. Email api@gunbroker.com.";
  }

  if (/unauthorized/i.test(raw)) {
    return gunBrokerEnvironment() === "sandbox"
      ? "Sandbox rejected that username or password. Use the login from sandbox.gunbroker.com — the live GunBroker password will not work here."
      : "GunBroker rejected that username or password.";
  }

  return raw;
}

export async function getGunBrokerStatus(userId: string): Promise<GunBrokerStatus> {
  const row = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: GUNBROKER_PROVIDER } },
  });
  const devKey = gunBrokerDevKey();
    const ping = devKey
      ? await pingGunBroker()
      : { ok: false as const, error: "GunBroker is not configured on this server." };

  return {
    status: (row?.status as GunBrokerStatus["status"]) ?? "disconnected",
    environment: gunBrokerEnvironment(),
    username: row?.username ?? gunBrokerDefaultUsername(),
    hasPassword: Boolean(row?.secretsCipher),
    externalUserId: row?.externalUserId ?? null,
    externalUsername: row?.externalUsername ?? null,
    lastVerifiedAt: row?.lastVerifiedAt?.toISOString() ?? null,
    lastError: row?.lastError ?? null,
    devKeyConfigured: Boolean(devKey),
    apiReachable: devKey ? ping.ok : false,
    apiError: ping.ok ? null : ping.error,
  };
}

async function upsertConnection(
  userId: string,
  data: {
    status: string;
    username: string | null;
    secrets: GunBrokerSecrets | null;
    externalUserId: string | null;
    externalUsername: string | null;
    lastError: string | null;
    verified: boolean;
  },
) {
  return prisma.integration.upsert({
    where: { userId_provider: { userId, provider: GUNBROKER_PROVIDER } },
    create: {
      userId,
      provider: GUNBROKER_PROVIDER,
      status: data.status,
      environment: gunBrokerEnvironment(),
      username: data.username,
      secretsCipher: data.secrets ? encryptSecret(JSON.stringify(data.secrets)) : null,
      externalUserId: data.externalUserId,
      externalUsername: data.externalUsername,
      lastError: data.lastError,
      lastVerifiedAt: data.verified ? new Date() : null,
    },
    update: {
      status: data.status,
      environment: gunBrokerEnvironment(),
      username: data.username,
      secretsCipher: data.secrets ? encryptSecret(JSON.stringify(data.secrets)) : null,
      externalUserId: data.externalUserId,
      externalUsername: data.externalUsername,
      lastError: data.lastError,
      lastVerifiedAt: data.verified ? new Date() : null,
    },
  });
}

export async function connectGunBrokerAccount(
  userId: string,
  input: {
    username: string;
    password: string;
  },
) {
  const username = input.username.trim();
  const password = input.password;
  if (!username || !password) {
    throw new Error("GunBroker username and password are required.");
  }
  if (!gunBrokerDevKey()) {
    throw new Error("GunBroker is not configured on this server.");
  }

  try {
    const accessToken = await createAccessToken(username, password);
    const account = await getAccountInfo(accessToken);
    await upsertConnection(userId, {
      status: "connected",
      username,
      secrets: { password, accessToken },
      externalUserId: account.userId,
      externalUsername: account.userName ?? username,
      lastError: null,
      verified: true,
    });
  } catch (error) {
    const message = explainGunBrokerError(error);
    await upsertConnection(userId, {
      status: "error",
      username,
      secrets: { password },
      externalUserId: null,
      externalUsername: null,
      lastError: message,
      verified: false,
    });
    throw new Error(message);
  }
}

export async function testGunBrokerAccount(userId: string) {
  const row = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: GUNBROKER_PROVIDER } },
  });
  const secrets = readSecrets(row?.secretsCipher ?? null);
  if (!row?.username || !secrets?.password) {
    throw new Error("Connect GunBroker before testing the connection.");
  }

  let accessToken = secrets.accessToken;
  try {
    if (!accessToken) {
      accessToken = await createAccessToken(row.username, secrets.password);
    }
    let account;
    try {
      account = await getAccountInfo(accessToken);
    } catch (error) {
      if (!(error instanceof GunBrokerApiError) || error.status !== 401) {
        throw error;
      }
      accessToken = await createAccessToken(row.username, secrets.password);
      account = await getAccountInfo(accessToken);
    }

    await upsertConnection(userId, {
      status: "connected",
      username: row.username,
      secrets: { password: secrets.password, accessToken },
      externalUserId: account.userId,
      externalUsername: account.userName ?? row.username,
      lastError: null,
      verified: true,
    });
  } catch (error) {
    const message = explainGunBrokerError(error);
    await prisma.integration.update({
      where: { userId_provider: { userId, provider: GUNBROKER_PROVIDER } },
      data: { status: "error", lastError: message },
    });
    throw new Error(message);
  }
}

export async function disconnectGunBrokerAccount(userId: string) {
  const row = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: GUNBROKER_PROVIDER } },
  });
  const secrets = readSecrets(row?.secretsCipher ?? null);
  if (row && secrets?.accessToken) {
    await deleteAccessToken(secrets.accessToken);
  }
  if (row) {
    await prisma.integration.update({
      where: { userId_provider: { userId, provider: GUNBROKER_PROVIDER } },
      data: {
        status: "disconnected",
        secretsCipher: null,
        externalUserId: null,
        externalUsername: null,
        lastVerifiedAt: null,
        lastError: null,
      },
    });
  }
}

export async function pingConfiguredApi() {
  if (!gunBrokerDevKey()) {
    return { ok: false as const, error: "GunBroker is not configured on this server." };
  }
  return pingGunBroker();
}

export async function withGunBrokerAccess<T>(
  userId: string,
  fn: (accessToken: string) => Promise<T>,
): Promise<T> {
  const row = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: GUNBROKER_PROVIDER } },
  });
  const secrets = readSecrets(row?.secretsCipher ?? null);
  if (!row?.username || !secrets?.password) {
    throw new Error("Connect GunBroker in Settings before importing listings.");
  }

  async function persistToken(accessToken: string) {
    await prisma.integration.update({
      where: { userId_provider: { userId, provider: GUNBROKER_PROVIDER } },
      data: {
        status: "connected",
        lastError: null,
        lastVerifiedAt: new Date(),
        secretsCipher: encryptSecret(
          JSON.stringify({ password: secrets!.password, accessToken }),
        ),
      },
    });
  }

  let accessToken = secrets.accessToken;
  if (!accessToken) {
    accessToken = await createAccessToken(row.username, secrets.password);
    await persistToken(accessToken);
  }

  try {
    return await fn(accessToken);
  } catch (error) {
    if (!(error instanceof GunBrokerApiError) || error.status !== 401) {
      throw new Error(explainGunBrokerError(error));
    }
    accessToken = await createAccessToken(row.username, secrets.password);
    await persistToken(accessToken);
    try {
      return await fn(accessToken);
    } catch (retryError) {
      throw new Error(explainGunBrokerError(retryError));
    }
  }
}

export async function isGunBrokerConnected(userId: string) {
  const row = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: GUNBROKER_PROVIDER } },
    select: { status: true, secretsCipher: true },
  });
  return row?.status === "connected" && Boolean(row.secretsCipher);
}
