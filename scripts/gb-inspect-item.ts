import { PrismaClient } from "@prisma/client";
import { withGunBrokerAccess } from "../src/lib/gunbroker/service";
import { getItem } from "../src/lib/gunbroker/client";
import { characteristicValue, pickField } from "../src/lib/gunbroker/types";

const prisma = new PrismaClient();

async function main() {
  const itemId = process.argv[2];
  if (!itemId) throw new Error("usage: gb-inspect-item.ts <itemId>");
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("no user");
  await withGunBrokerAccess(user.id, async (token) => {
    const item = await getItem(token, itemId);
    console.log("itemCharacteristics:", JSON.stringify(pickField(item, "itemCharacteristics", "ItemCharacteristics"), null, 2));
    console.log("manufacturer:", characteristicValue(item, "manufacturer", "Manufacturer", "manufacture", "Manufacture", "manufacturerName"));
    console.log("caliber:", characteristicValue(item, "caliber", "Caliber", "gauge", "Gauge"));
  });
}

main().finally(() => prisma.$disconnect());
