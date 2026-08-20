"use server";

import { setSoldOrderWorkStatus } from "@/lib/gunbroker/orders";
import {
  checkSoldOrderOnShipStation,
  sendSoldOrderToShipStation,
  updateSoldOrdersFromShipStation,
} from "@/lib/shipstation/sold-orders";
import { getSession } from "@/lib/session";
import { revalidateSoldPages } from "@/lib/revalidate-sold";

async function requireUserId() {
  const session = await getSession();
  if (!session) {
    return { ok: false as const, error: "Sign in to manage sold orders." };
  }
  return { ok: true as const, userId: session.user.id };
}

export async function setSoldOrderWorkStatusAction(
  orderId: string,
  workStatus: "pending" | "complete",
) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await setSoldOrderWorkStatus(auth.userId, orderId, workStatus);
    revalidateSoldPages();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not update the order.",
    };
  }
}

export async function sendSoldOrderToShipStationAction(orderId: string) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    const result = await sendSoldOrderToShipStation(auth.userId, orderId);
    revalidateSoldPages();
    return { ok: true as const, result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not send the order to ShipStation.",
    };
  }
}

export async function checkSoldOrderOnShipStationAction(orderId: string) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    const result = await checkSoldOrderOnShipStation(auth.userId, orderId);
    revalidateSoldPages();
    return { ok: true as const, result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not check ShipStation status.",
    };
  }
}

export async function updateSoldOrdersFromShipStationAction() {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    const result = await updateSoldOrdersFromShipStation(auth.userId);
    revalidateSoldPages();
    return { ok: true as const, result };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not update from ShipStation.",
    };
  }
}
