import { PrismaClient } from "@prisma/client";
import { withGunBrokerAccess } from "../src/lib/gunbroker/service";
import {
  getItem,
  getItemPictures,
  getListingDefaults,
  getAccountPayload,
  getContactInfo,
  getCategoryCharacteristics,
} from "../src/lib/gunbroker/client";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("no user");
  const template = await prisma.listing.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  if (!template) throw new Error("no template");

  await withGunBrokerAccess(user.id, async (token) => {
    const item = await getItem(token, template.itemId);
    const { asEnumId, pickField } = await import("../src/lib/gunbroker/types");
    const categoryId = asEnumId(pickField(item, "categoryID", "CategoryID", "categoryId"));
    console.log("categoryId", categoryId);
    try {
      const catalog = await getCategoryCharacteristics(token, categoryId!);
      console.log("catalog raw:", JSON.stringify(catalog, null, 2).slice(0, 2000));
    } catch (e) {
      console.log("catalog error:", e instanceof Error ? e.message : e);
    }
  });
}

main().finally(() => prisma.$disconnect());
