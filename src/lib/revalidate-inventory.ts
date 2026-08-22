import { revalidatePath } from "next/cache";
import {
  DEFAULTS_PATH,
  GUNBROKER_INVENTORY_PATH,
  WOOCOMMERCE_INVENTORY_PATH,
} from "@/lib/inventory-paths";

export function revalidateInventoryPages() {
  revalidatePath("/app/inventory");
  revalidatePath(GUNBROKER_INVENTORY_PATH);
  revalidatePath(WOOCOMMERCE_INVENTORY_PATH);
  revalidatePath(DEFAULTS_PATH);
  revalidatePath(`${WOOCOMMERCE_INVENTORY_PATH}`, "layout");
}
