import { PrismaClient } from "@prisma/client";
import { gunBrokerRequest } from "../src/lib/gunbroker/client";
import { endItem, getItem } from "../src/lib/gunbroker/client";
import { withGunBrokerAccess } from "../src/lib/gunbroker/service";
import { characteristicValue, pickField } from "../src/lib/gunbroker/types";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  const sourceId = "15811068";

  await withGunBrokerAccess(user!.id, async (token) => {
    for (const path of [
      `/Items/${sourceId}/Relist`,
      `/Items/Relist/${sourceId}`,
      `/Listing/Relist/${sourceId}`,
    ]) {
      console.log("\ntry", path);
      try {
        const payload = await gunBrokerRequest({
          path,
          method: "POST",
          accessToken: token,
          body: {
            Title: "Chamber relist endpoint test delete",
            FixedPriceQuantity: 1,
            Quantity: 1,
          },
        });
        const itemId = String(pickField(payload, "itemID", "ItemID", "itemId") ?? "");
        console.log("created", itemId, payload);
        if (itemId) {
          const live = await getItem(token, itemId);
          console.log(
            "mfg",
            characteristicValue(live, "manufacturer", "Manufacturer", "manufacture", "Manufacture", "manufacturerName"),
            "cal",
            characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge"),
          );
          console.log(JSON.stringify(pickField(live, "itemCharacteristics", "ItemCharacteristics")));
          await endItem(token, itemId);
        }
      } catch (e) {
        console.log("error", e instanceof Error ? e.message.slice(0, 240) : e);
      }
    }
  });
}

main().finally(() => prisma.$disconnect());
