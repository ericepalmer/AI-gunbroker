"use server";

import { getSession } from "@/lib/session";
import {
  breakWooGunBrokerLink,
  linkWooProductToGunBroker,
  previewWooGunBrokerLink,
  pushWooProductToGunBroker,
  setWooQuantitySource,
  type BreakWooLinkChoice,
} from "@/lib/woocommerce/service";
import type { QuantitySource } from "@/lib/woocommerce/types";
import { revalidateInventoryPages } from "@/lib/revalidate-inventory";
import { wooProductDetailPath } from "@/lib/inventory-paths";
import { revalidatePath } from "next/cache";

async function requireUserId() {
  const session = await getSession();
  if (!session) {
    return { ok: false as const, error: "Sign in to manage inventory." };
  }
  return { ok: true as const, userId: session.user.id };
}

function refreshInventory(productId?: number) {
  revalidateInventoryPages();
  if (productId != null) {
    revalidatePath(wooProductDetailPath(productId));
  }
}

export async function previewWooGunBrokerLinkAction(productId: number) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    const preview = await previewWooGunBrokerLink(auth.userId, productId);
    return { ok: true as const, preview };
  } catch (error) {
    return {
      ok: false as const,
      error:
        error instanceof Error
          ? error.message
          : "Could not preview the GunBroker listing.",
    };
  }
}

export async function setWooSourceAction(productId: number, sourced: boolean) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    if (sourced) {
      const linked = await linkWooProductToGunBroker(auth.userId, productId);
      refreshInventory(productId);
      return {
        ok: true as const,
        itemId: linked.itemId,
        alreadyLinked: linked.alreadyLinked,
      };
    }
    return {
      ok: false as const,
      error: "Break the WooCommerce link from the GunBroker inventory page.",
    };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not update GunBroker source.",
    };
  }
}

export async function pushWooToGunBrokerAction(productId: number) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    const result = await pushWooProductToGunBroker(auth.userId, productId);
    refreshInventory(productId);
    return { ok: true as const, itemId: result.itemId };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not push changes to GunBroker.",
    };
  }
}

export async function unlinkWooListingAction(
  productId: number,
  choice: BreakWooLinkChoice = "make-independent",
) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await breakWooGunBrokerLink(auth.userId, productId, choice);
    refreshInventory(productId);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not break the link.",
    };
  }
}

export async function setWooQuantitySourceAction(
  productId: number,
  quantitySource: QuantitySource,
  manualQuantity?: number | null,
) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await setWooQuantitySource(auth.userId, productId, quantitySource, manualQuantity);
    refreshInventory(productId);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not set the quantity source.",
    };
  }
}
