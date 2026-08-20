"use server";

import { getSession } from "@/lib/session";
import {
  connectShipStationAccount,
  disconnectShipStationAccount,
  testShipStationAccount,
} from "@/lib/shipstation/service";
import { revalidatePath } from "next/cache";
import { revalidateSoldPages } from "@/lib/revalidate-sold";

async function requireUserId() {
  const session = await getSession();
  if (!session) {
    return { ok: false as const, error: "Sign in to manage ShipStation settings." };
  }
  return { ok: true as const, userId: session.user.id };
}

export async function connectShipStationAction(input: { apiKey: string; apiSecret: string }) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await connectShipStationAccount(auth.userId, input);
    revalidatePath("/app/settings");
    revalidateSoldPages();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not connect to ShipStation.",
    };
  }
}

export async function testShipStationAction() {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await testShipStationAccount(auth.userId);
    revalidatePath("/app/settings");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "ShipStation test failed.",
    };
  }
}

export async function disconnectShipStationAction() {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await disconnectShipStationAccount(auth.userId);
    revalidatePath("/app/settings");
    revalidateSoldPages();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not disconnect.",
    };
  }
}
