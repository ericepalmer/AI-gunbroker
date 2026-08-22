import { PrismaClient } from "@prisma/client";
import {
  createItem,
  endItem,
  getItem,
  updateItem,
} from "../src/lib/gunbroker/client";
import { cloneGunBrokerListing } from "../src/lib/gunbroker/listings";
import { withGunBrokerAccess } from "../src/lib/gunbroker/service";
import {
  characteristicValue,
  parseShippingClasses,
  parseShippingClassCosts,
  shippingClassesForApi,
  shippingClassCostsForApi,
  hasAnyShippingClass,
  pickField,
} from "../src/lib/gunbroker/types";

const prisma = new PrismaClient();

async function inspect(token: string, itemId: string, label: string) {
  const live = await getItem(token, itemId);
  console.log(
    label,
    "mfg=",
    characteristicValue(live, "manufacturer", "Manufacturer", "manufacture", "Manufacture", "manufacturerName"),
    "cal=",
    characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge"),
  );
  console.log(label, "chars", JSON.stringify(pickField(live, "itemCharacteristics", "ItemCharacteristics")));
}

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("no user");
  const existing = await prisma.listing.findFirst({
    where: { userId: user.id, itemId: "15811068" },
  });
  if (!existing) throw new Error("no template");

  await withGunBrokerAccess(user.id, async (token) => {
    const templateItem = await getItem(token, existing.itemId);
    const classes = parseShippingClasses(existing.shippingClassesJson);
    const costs = parseShippingClassCosts(existing.shippingClassCostsJson);

    const base = {
      Title: "Chamber char format test delete",
      Description: "test",
      CategoryID: pickField(templateItem, "categoryID", "CategoryID", "categoryId"),
      Condition: 1,
      CountryCode: "US",
      Quantity: 1,
      ListingDuration: 90,
      PostalCode: "99501",
      FixedPrice: 49.99,
      InspectionPeriod: 1,
      IsFFLRequired: false,
      WillShipInternational: false,
      PaymentMethods: pickField(templateItem, "paymentMethods", "PaymentMethods"),
      WhoPaysForShipping: existing.whoPaysForShipping ?? 2,
      ShippingClassesSupported: shippingClassesForApi(classes),
      ShippingClassCosts: shippingClassCostsForApi(classes, costs),
      HasCharacteristics: true,
    };

    const formats: Record<string, unknown>[] = [
      {
        manufacturerName: "OTHER MANUFACTURER",
        Caliber: ".44 MAG.",
        NumberOfRoundsForSale: 20,
      },
      {
        manufacturerName: { "0": "OTHER MANUFACTURER" },
        Caliber: { "0": ".44 MAG." },
        NumberOfRoundsForSale: 20,
      },
      {
        Manufacture: "OTHER MANUFACTURER",
        Caliber: ".44 MAG.",
        NumberOfRoundsForSale: 20,
      },
    ];

    for (const [index, Characteristics] of formats.entries()) {
      console.log("\n=== format", index, JSON.stringify(Characteristics));
      let itemId = "";
      try {
        const payload = await createItem(token, { ...base, Characteristics });
        itemId = String(pickField(payload, "itemID", "ItemID", "itemId") ?? "");
        await inspect(token, itemId, "after create");
        await updateItem(token, itemId, {
          HasCharacteristics: true,
          Characteristics: {
            manufacturerName: "OTHER MANUFACTURER",
            Caliber: ".44 MAG.",
          },
        });
        await inspect(token, itemId, "after update");
      } catch (e) {
        console.log("error", e instanceof Error ? e.message.slice(0, 200) : e);
      } finally {
        if (itemId) await endItem(token, itemId).catch(() => undefined);
      }
    }
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
