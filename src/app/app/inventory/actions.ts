"use server";

import { cloneGunBrokerListing, commitListing, commitListingQuick, deleteGunBrokerListing, importGunBrokerInventory } from "@/lib/gunbroker/listings";
import type { ListingEdits } from "@/lib/gunbroker/types";
import { getSession } from "@/lib/session";
import { revalidatePath } from "next/cache";

async function requireUserId() {
  const session = await getSession();
  if (!session) {
    return { ok: false as const, error: "Sign in to manage inventory." };
  }
  return { ok: true as const, userId: session.user.id };
}

export async function importInventoryAction() {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    const result = await importGunBrokerInventory(auth.userId);
    revalidatePath("/app/inventory");
    return { ok: true as const, count: result.count };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not import listings.",
    };
  }
}

export async function commitListingAction(formData: FormData) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    const itemId = String(formData.get("itemId") ?? "");
    const edits = JSON.parse(String(formData.get("edits") ?? "{}")) as ListingEdits;
    const removePictureIds = JSON.parse(
      String(formData.get("removePictureIds") ?? "[]"),
    ) as string[];
    const added = formData.getAll("picture").flatMap((value) => {
      if (typeof value === "string") return [];
      const file = value as Blob & { name?: string };
      if (!file.size) return [];
      return [file as File];
    });
    const listing = await commitListing(auth.userId, itemId, edits, {
      removePictureIds: removePictureIds.filter(Boolean),
      added,
    });
    revalidatePath("/app/inventory");
    revalidatePath(`/app/inventory/${itemId}`);
    return { ok: true as const, listing };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not send changes to GunBroker.",
    };
  }
}

export async function commitListingQuickAction(
  itemId: string,
  input: { quantity: number; price: number | null },
) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await commitListingQuick(auth.userId, itemId, input);
    revalidatePath("/app/inventory");
    revalidatePath(`/app/inventory/${itemId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not send changes to GunBroker.",
    };
  }
}

export async function deleteListingAction(itemId: string) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    await deleteGunBrokerListing(auth.userId, itemId);
    revalidatePath("/app/inventory");
    revalidatePath(`/app/inventory/${itemId}`);
    return { ok: true as const };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not delete listing.",
    };
  }
}

export async function cloneListingAction(itemId: string) {
  const auth = await requireUserId();
  if (!auth.ok) return auth;
  try {
    const newItemId = await cloneGunBrokerListing(auth.userId, itemId);
    revalidatePath("/app/inventory");
    revalidatePath(`/app/inventory/${newItemId}`);
    return { ok: true as const, itemId: newItemId };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not clone listing.",
    };
  }
}
