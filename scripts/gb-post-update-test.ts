import { PrismaClient } from "@prisma/client";
import { getItem, updateItem } from "../src/lib/gunbroker/client";
import { cloneGunBrokerListing, deleteGunBrokerListing } from "../src/lib/gunbroker/listings";
import { withGunBrokerAccess } from "../src/lib/gunbroker/service";
import { characteristicValue, pickField } from "../src/lib/gunbroker/types";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("no user");
  const template = await prisma.listing.findFirst({
    where: { userId: user.id },
    orderBy: { updatedAt: "desc" },
  });
  if (!template) throw new Error("no template");

  const itemId = await cloneGunBrokerListing(user.id, template.itemId, {
    preferredTitle: "Chamber post-update test delete",
    preferredDescription: "test",
    preferredManufacturer: "Sleeping Dog Ammo",
    preferredCaliber: "45-70",
    preferredRounds: 20,
  });

  await withGunBrokerAccess(user.id, async (token) => {
    const before = await getItem(token, itemId);
    console.log("before update", JSON.stringify(pickField(before, "itemCharacteristics", "ItemCharacteristics")));

    await updateItem(token, itemId, {
      HasCharacteristics: true,
      Characteristics: {
        manufacturerName: "OTHER MANUFACTURER",
        Caliber: ".44 MAG.",
        NumberOfRoundsForSale: 20,
      },
      Manufacturer: "OTHER MANUFACTURER",
      Manufacture: "OTHER MANUFACTURER",
      Caliber: ".44 MAG.",
    });

    const after = await getItem(token, itemId);
    console.log(
      "after update mfg",
      characteristicValue(after, "manufacturer", "Manufacturer", "manufacture", "Manufacture", "manufacturerName"),
    );
    console.log("after update cal", characteristicValue(after, "caliber", "Caliber", "gauge", "Gauge"));
    console.log("after update chars", JSON.stringify(pickField(after, "itemCharacteristics", "ItemCharacteristics")));
  });

  await deleteGunBrokerListing(user.id, itemId);
  console.log("deleted", itemId);
}

main().finally(() => prisma.$disconnect());
