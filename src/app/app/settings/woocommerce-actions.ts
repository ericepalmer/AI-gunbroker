"use server";

import { getSession } from "@/lib/session";
import {
  connectWooCommerceStore,
  disconnectWooCommerceStore,
  testWooCommerceStore,
} from "@/lib/woocommerce/service";
import { revalidatePath } from "next/cache";
import { revalidateInventoryPages } from "@/lib/revalidate-inventory";

async function requireUserId() {
  const session = await getSession();
  if (!session) {
    return { ok: false as const, error: "Sign in to manage WooCommerce settings." };
  }
  return { ok: true as const, userId: session.user.id };
}

export async function connectWooCommerceAction(input: {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
}) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await connectWooCommerceStore(auth.userId, input);
    revalidatePath("/app/settings");
    revalidateInventoryPages();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not connect to WooCommerce.",
    };
  }
}

export async function testWooCommerceAction() {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await testWooCommerceStore(auth.userId);
    revalidatePath("/app/settings");
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "WooCommerce test failed.",
    };
  }
}

export async function disconnectWooCommerceAction() {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await disconnectWooCommerceStore(auth.userId);
    revalidatePath("/app/settings");
    revalidateInventoryPages();
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not disconnect.",
    };
  }
}
