import { PrismaClient } from "@prisma/client";
import { createItem, endItem, getItem } from "../src/lib/gunbroker/client";
import { withGunBrokerAccess } from "../src/lib/gunbroker/service";
import {
  characteristicValue,
  parsePaymentMethods,
  parseShippingClasses,
  parseShippingClassCosts,
  paymentMethodsForApi,
  shippingClassesForApi,
  shippingClassCostsForApi,
  pickField,
} from "../src/lib/gunbroker/types";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  const existing = await prisma.listing.findFirst({
    where: { userId: user!.id, itemId: "15811068" },
  });
  if (!existing) throw new Error("no template");

  await withGunBrokerAccess(user!.id, async (token) => {
    const templateItem = await getItem(token, "15811068");
    const classes = parseShippingClasses(existing.shippingClassesJson);
    const costs = parseShippingClassCosts(existing.shippingClassCostsJson);
    const paymentMethods = paymentMethodsForApi(parsePaymentMethods(existing.paymentMethodsJson));

    const body = {
      Title: "Chamber exact template chars test",
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
      PaymentMethods: paymentMethods,
      WhoPaysForShipping: existing.whoPaysForShipping ?? 2,
      ShippingClassesSupported: shippingClassesForApi(classes),
      ShippingClassCosts: shippingClassCostsForApi(classes, costs),
      HasCharacteristics: true,
      Characteristics: {
        manufacturerName: "OTHER MANUFACTURER",
        Caliber: ".44 MAG.",
        NumberOfRoundsForSale: 25,
      },
    };

    const attempts: Record<string, unknown>[] = [
      {
        manufacturerName: "OTHER MANUFACTURER",
        Caliber: ".44 MAG.",
        NumberOfRoundsForSale: 25,
      },
      {
        manufacturerName: { "0": "OTHER MANUFACTURER" },
        Caliber: { "0": ".44 MAG." },
        NumberOfRoundsForSale: 25,
      },
      {
        Manufacture: "OTHER MANUFACTURER",
        Caliber: ".44 MAG.",
        NumberOfRoundsForSale: 25,
      },
    ];

    for (const [index, Characteristics] of attempts.entries()) {
      console.log("\n=== attempt", index, JSON.stringify(Characteristics));
      let itemId = "";
      try {
        const payload = await createItem(token, { ...body, Characteristics });
        itemId = String(pickField(payload, "itemID", "ItemID", "itemId") ?? "");
        for (const wait of [0, 2000]) {
          if (wait) await new Promise((r) => setTimeout(r, wait));
          const live = await getItem(token, itemId);
          console.log(
            `t+${wait}`,
            characteristicValue(live, "manufacturer", "Manufacturer", "manufacture", "Manufacture", "manufacturerName"),
            characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge"),
            JSON.stringify(pickField(live, "itemCharacteristics", "ItemCharacteristics")),
          );
        }
      } catch (e) {
        console.log("error", e instanceof Error ? e.message.slice(0, 240) : e);
      } finally {
        if (itemId) await endItem(token, itemId).catch(() => undefined);
      }
    }
  });
}

main().finally(() => prisma.$disconnect());
