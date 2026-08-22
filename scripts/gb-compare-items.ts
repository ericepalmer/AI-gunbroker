import { PrismaClient } from "@prisma/client";
import { withGunBrokerAccess } from "../src/lib/gunbroker/service";
import { getItem, listItemsSelling } from "../src/lib/gunbroker/client";
import { characteristicValue, pickField, asString } from "../src/lib/gunbroker/types";

const prisma = new PrismaClient();

const CANDIDATES = [
  "15811068", // template (website-created, good)
  "15902255", // recent Woo link
  "15913167", // clean test (ended)
  "15913168", // clean test (ended)
  "15901916", // orphaned chars-only test
  "15901917",
  "15901918",
  "15901881", // from earlier session logs
  "15901880",
  "15901877",
];

function summarize(item: unknown, itemId: string) {
  const chars = pickField(item, "itemCharacteristics", "ItemCharacteristics");
  return {
    itemId,
    title: asString(pickField(item, "title", "Title")),
    categoryName: asString(pickField(item, "categoryName", "CategoryName")),
    isActive: pickField(item, "isActive", "IsActive"),
    manufacturer: characteristicValue(
      item,
      "manufacturer",
      "Manufacturer",
      "manufacture",
      "Manufacture",
      "manufacturerName",
    ),
    caliber: characteristicValue(item, "caliber", "Caliber", "gauge", "Gauge"),
    rounds:
      characteristicValue(item, "NumberOfRoundsForSale", "numberOfRoundsForSale") ??
      characteristicValue(item, "NumberOfRoundsPerQuantityOne", "numberOfRoundsPerQuantityOne"),
    itemCharacteristics: chars,
  };
}

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user");

  await withGunBrokerAccess(user.id, async (token) => {
    console.log("=== Selling listings (first page) ===");
    const selling = await listItemsSelling(token, 1, 50);
    console.log("count:", selling.count);
    const testLike = selling.results.filter((row) => {
      const title = asString(pickField(row, "title", "Title")) ?? "";
      return /chamber|test|delete|clone|diag|catalog/i.test(title);
    });
    for (const row of testLike.slice(0, 15)) {
      const id = asString(pickField(row, "itemID", "ItemID", "itemId")) ?? "?";
      console.log("-", id, asString(pickField(row, "title", "Title")));
    }

    console.log("\n=== Item inspection ===");
    for (const itemId of CANDIDATES) {
      console.log("\n---", itemId, "---");
      try {
        const item = await getItem(token, itemId);
        console.log(JSON.stringify(summarize(item, itemId), null, 2));
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.log("GET failed:", message.slice(0, 300));
      }
    }
  });
}

main().finally(() => prisma.$disconnect());
