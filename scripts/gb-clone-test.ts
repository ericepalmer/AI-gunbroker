import { PrismaClient } from "@prisma/client";
import { cloneGunBrokerListing } from "../src/lib/gunbroker/listings";
import { deleteGunBrokerListing } from "../src/lib/gunbroker/listings";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("no user");
  const template = await prisma.listing.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  const woo = await prisma.wooProduct.findFirst({
    where: { productId: 3188 },
  });
  if (!template || !woo) throw new Error("missing data");

  console.log("template", template.itemId, "woo", woo.manufacturer, woo.caliber);
  try {
    const itemId = await cloneGunBrokerListing(user.id, template.itemId, {
      preferredTitle: "Chamber clone test delete me",
      preferredDescription: "test",
      preferredManufacturer: "Sleeping Dog Ammo",
      preferredCaliber: "45-70",
      preferredRounds: 20,
    });
    const local = await prisma.listing.findUnique({
      where: { userId_itemId: { userId: user.id, itemId } },
    });
    console.log("local DB", local?.manufacturer, local?.caliber, local?.rounds);
    console.log("created", itemId);
    const { withGunBrokerAccess } = await import("../src/lib/gunbroker/service");
    const { getItem } = await import("../src/lib/gunbroker/client");
    const { characteristicValue } = await import("../src/lib/gunbroker/types");
    await withGunBrokerAccess(user.id, async (token) => {
      const live = await getItem(token, itemId);
      const { pickField } = await import("../src/lib/gunbroker/types");
      console.log(
        "itemCharacteristics",
        JSON.stringify(pickField(live, "itemCharacteristics", "ItemCharacteristics"), null, 2),
      );
      console.log(
        "GB manufacturer",
        characteristicValue(live, "manufacturer", "Manufacturer", "manufacture", "Manufacture", "manufacturerName"),
      );
      console.log("GB caliber", characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge"));
    });
    await deleteGunBrokerListing(user.id, itemId);
    console.log("deleted", itemId);
  } catch (error) {
    console.error("clone failed:", error);
    process.exit(1);
  }
}

main().finally(() => prisma.$disconnect());
