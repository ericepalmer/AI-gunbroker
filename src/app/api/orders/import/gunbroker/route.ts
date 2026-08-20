import { NextResponse } from "next/server";
import { importGunBrokerSoldOrders } from "@/lib/gunbroker/orders";
import { ndjsonImportResponse } from "@/lib/import-stream-response";
import { revalidateSoldPages } from "@/lib/revalidate-sold";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

export async function POST() {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to sync sold orders." }, { status: 401 });
  }

  return ndjsonImportResponse(async (onProgress) => {
    const result = await importGunBrokerSoldOrders(session.user.id, onProgress);
    revalidateSoldPages();
    return result;
  });
}
