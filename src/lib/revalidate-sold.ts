import { revalidatePath } from "next/cache";

export function revalidateSoldPages() {
  revalidatePath("/app/sold");
  revalidatePath("/app/shipstation");
  revalidatePath("/app/inventory/gunbroker");
  revalidatePath("/app/inventory/woocommerce");
  revalidatePath("/app");
}
