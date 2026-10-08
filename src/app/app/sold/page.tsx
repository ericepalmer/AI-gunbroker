import { redirect } from "next/navigation";

/** Processing desk removed — orders are tracked on ShipStation Status by source. */
export default function SoldPage() {
  redirect("/app/shipstation");
}
