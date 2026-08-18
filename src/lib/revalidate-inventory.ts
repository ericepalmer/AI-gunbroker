import { revalidatePath } from "next/cache";
import {
  GUNBROKER_INVENTORY_PATH,
  WOOCOMMERCE_INVENTORY_PATH,
} from "@/lib/inventory-paths";

export function revalidateInventoryPages() {
  revalidatePath("/app/inventory");
  revalidatePath(GUNBROKER_INVENTORY_PATH);
  revalidatePath(WOOCOMMERCE_INVENTORY_PATH);
}
