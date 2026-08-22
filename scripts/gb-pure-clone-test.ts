import { PrismaClient } from "@prisma/client";
import { getItem } from "../src/lib/gunbroker/client";
import { cloneGunBrokerListing, deleteGunBrokerListing } from "../src/lib/gunbroker/listings";
import { withGunBrokerAccess } from "../src/lib/gunbroker/service";
import { characteristicValue, pickField } from "../src/lib/gunbroker/types";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  const template = await prisma.listing.findFirst({
    where: { userId: user!.id },
    orderBy: { updatedAt: "desc" },
  });
  if (!template) throw new Error("no template");

  // Pure clone — no Woo overlay
  const itemId = await cloneGunBrokerListing(user!.id, template.itemId, {
    preferredTitle: "Chamber pure clone test delete",
  });

  await withGunBrokerAccess(user!.id, async (token) => {
    const live = await getItem(token, itemId);
    console.log(
      "pure clone mfg",
      characteristicValue(live, "manufacturer", "Manufacturer", "manufacture", "Manufacture", "manufacturerName"),
    );
    console.log("pure clone cal", characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge"));
    console.log(JSON.stringify(pickField(live, "itemCharacteristics", "ItemCharacteristics"), null, 2));
  });

  await deleteGunBrokerListing(user!.id, itemId);
}

main().finally(() => prisma.$disconnect());
