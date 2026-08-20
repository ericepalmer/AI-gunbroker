import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { importGunBrokerInventory } from "@/lib/gunbroker/listings";
import { ndjsonImportResponse } from "@/lib/import-stream-response";
import { getSession } from "@/lib/session";
import { importWooCommerceProducts } from "@/lib/woocommerce/service";

export const dynamic = "force-dynamic";

export async function POST(
  _request: Request,
  context: { params: Promise<{ source: string }> },
) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Sign in to import." }, { status: 401 });
  }

  const { source } = await context.params;
  if (source === "gunbroker") {
    return ndjsonImportResponse((onProgress) =>
      importGunBrokerInventory(session.user.id, onProgress),
    );
  }
  if (source === "woocommerce") {
    return ndjsonImportResponse(async (onProgress) => {
      const result = await importWooCommerceProducts(session.user.id, onProgress);
      revalidatePath("/app/settings");
      return result;
    });
  }

  return NextResponse.json({ error: "Unknown import source." }, { status: 404 });
}
