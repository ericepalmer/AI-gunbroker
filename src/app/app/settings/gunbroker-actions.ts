"use server";

import {
  connectGunBrokerAccount,
  disconnectGunBrokerAccount,
  pingConfiguredApi,
  testGunBrokerAccount,
} from "@/lib/gunbroker/service";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function requireUserId() {
  const session = await getSession();
  if (!session) {
    return { ok: false as const, error: "Sign in to manage GunBroker settings." };
  }
  return { ok: true as const, userId: session.user.id };
}

export async function connectGunBrokerAction(input: {
  username: string;
  password: string;
}) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await connectGunBrokerAccount(auth.userId, input);
    revalidatePath("/app/settings");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not connect to GunBroker.",
    };
  }
}

export async function testGunBrokerAction() {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await testGunBrokerAccount(auth.userId);
    revalidatePath("/app/settings");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "GunBroker test failed.",
    };
  }
}

export async function disconnectGunBrokerAction() {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await disconnectGunBrokerAccount(auth.userId);
    revalidatePath("/app/settings");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not disconnect.",
    };
  }
}

export async function pingGunBrokerAction() {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  return pingConfiguredApi();
}
