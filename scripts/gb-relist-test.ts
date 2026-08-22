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

    const base = {
      Title: "Chamber relist source test delete",
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
      RelistedAsItemID: 15811068,
      relistedAsItemID: 15811068,
    };

    for (const extra of [
      {},
      {
        Characteristics: {
          manufacturerName: { "0": "OTHER MANUFACTURER" },
          Caliber: { "0": ".44 MAG." },
          NumberOfRoundsForSale: 50,
        },
      },
    ]) {
      console.log("\nextra keys", Object.keys(extra));
      let itemId = "";
      try {
        const payload = await createItem(token, { ...base, ...extra });
        itemId = String(pickField(payload, "itemID", "ItemID", "itemId") ?? "");
        const live = await getItem(token, itemId);
        console.log(
          characteristicValue(live, "manufacturer", "Manufacturer", "manufacture", "Manufacture", "manufacturerName"),
          characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge"),
        );
        console.log(JSON.stringify(pickField(live, "itemCharacteristics", "ItemCharacteristics")));
        console.log("relistedAsItemID on result", pickField(live, "relistedAsItemID", "RelistedAsItemID"));
      } catch (e) {
        console.log("error", e instanceof Error ? e.message.slice(0, 300) : e);
      } finally {
        if (itemId) await endItem(token, itemId).catch(() => undefined);
      }
    }
  });
}

main().finally(() => prisma.$disconnect());
