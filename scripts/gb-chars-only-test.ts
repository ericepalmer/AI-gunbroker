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
  const existing = await prisma.listing.findFirst({ where: { userId: user!.id, itemId: "15811068" } });
  if (!existing) throw new Error("no template");

  await withGunBrokerAccess(user!.id, async (token) => {
    const templateItem = await getItem(token, "15811068");
    const classes = parseShippingClasses(existing.shippingClassesJson);
    const costs = parseShippingClassCosts(existing.shippingClassCostsJson);
    const paymentMethods = paymentMethodsForApi(parsePaymentMethods(existing.paymentMethodsJson));
    const itemCharacteristics = pickField(templateItem, "itemCharacteristics", "ItemCharacteristics");

    const base = {
      Title: "Chamber chars-only test delete",
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
    };

    const attempts: Record<string, unknown>[] = [
      {
        Characteristics: {
          manufacturerName: "OTHER MANUFACTURER",
          Caliber: ".44 MAG.",
        },
      },
      { ItemCharacteristics: itemCharacteristics },
      {
        Characteristics: {
          manufacturerName: "OTHER MANUFACTURER",
          Caliber: ".44 MAG.",
        },
        ItemCharacteristics: itemCharacteristics,
      },
    ];

    for (const [i, extra] of attempts.entries()) {
      console.log("\nattempt", i);
      let itemId = "";
      try {
        const payload = await createItem(token, { ...base, ...extra });
        console.log("create response", JSON.stringify(payload));
        itemId = String(pickField(payload, "itemID", "ItemID", "itemId") ?? "");
        if (!itemId) continue;
        const live = await getItem(token, itemId);
        console.log(
          characteristicValue(live, "manufacturer", "Manufacturer", "manufacture", "Manufacture", "manufacturerName"),
          characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge"),
          JSON.stringify(pickField(live, "itemCharacteristics", "ItemCharacteristics")),
        );
      } catch (e) {
        console.log("error", e instanceof Error ? e.message.slice(0, 200) : e);
      } finally {
        if (itemId) await endItem(token, itemId).catch(() => undefined);
      }
    }
  });
}

main().finally(() => prisma.$disconnect());
