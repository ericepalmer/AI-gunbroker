import { redirect } from "next/navigation";
import { WOOCOMMERCE_INVENTORY_PATH } from "@/lib/inventory-paths";

export default function StorePage() {
  redirect(WOOCOMMERCE_INVENTORY_PATH);
}
