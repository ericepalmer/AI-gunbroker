"use server";

import { getSession } from "@/lib/session";
import { importWooCommerceProducts } from "@/lib/woocommerce/service";
import { revalidatePath } from "next/cache";
import { revalidateInventoryPages } from "@/lib/revalidate-inventory";

export async function importWooProductsAction() {
  const session = await getSession();
  if (!session) {
    return { ok: false as const, error: "Sign in to import store products." };
  }
  try {
    const result = await importWooCommerceProducts(session.user.id);
    revalidateInventoryPages();
    revalidatePath("/app/settings");
    return { ok: true as const, count: result.count };
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "Could not import WooCommerce products.",
    };
  }
}
