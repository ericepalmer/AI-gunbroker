import { revalidatePath } from "next/cache";

export function revalidateShipStationPages() {
  revalidatePath("/app/shipstation");
  revalidatePath("/app/sold");
  revalidatePath("/app");
}
