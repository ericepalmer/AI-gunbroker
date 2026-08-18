import { redirect } from "next/navigation";
import { GUNBROKER_INVENTORY_PATH } from "@/lib/inventory-paths";

export default function InventoryPage() {
  redirect(GUNBROKER_INVENTORY_PATH);
}
