import { PrismaClient } from "@prisma/client";
import { gunBrokerRequest, endItem, getItem } from "../src/lib/gunbroker/client";
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

    const body = {
      Title: "Chamber listing post test delete",
      Description: "test",
      Category: pickField(templateItem, "categoryID", "CategoryID", "categoryId"),
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
      Characteristics: [
        { Name: "manufacturerName", Value: "OTHER MANUFACTURER" },
        { Name: "Caliber", Value: ".44 MAG." },
        { Name: "NumberOfRoundsForSale", Value: "50" },
      ],
    };

    try {
      const payload = await gunBrokerRequest({
        path: "/Listing",
        method: "POST",
        accessToken: token,
        body,
      });
      console.log("payload", payload);
      const itemId = String(pickField(payload, "itemID", "ItemID", "itemId") ?? "");
      if (itemId) {
        const live = await getItem(token, itemId);
        console.log(
          characteristicValue(live, "manufacturer", "Manufacturer", "manufacture", "Manufacture", "manufacturerName"),
          characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge"),
        );
        console.log(JSON.stringify(pickField(live, "itemCharacteristics", "ItemCharacteristics")));
        await endItem(token, itemId);
      }
    } catch (e) {
      console.log("error", e instanceof Error ? e.message : e);
    }
  });
}

main().finally(() => prisma.$disconnect());
