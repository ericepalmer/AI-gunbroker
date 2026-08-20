import { revalidatePath } from "next/cache";

export function revalidateSoldPages() {
  revalidatePath("/app/sold");
  revalidatePath("/app");
}
