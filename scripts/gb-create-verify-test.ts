import { PrismaClient } from "@prisma/client";
import { createItem, endItem, getItem } from "../src/lib/gunbroker/client";
import { parsePaymentMethods, parseShippingClasses, paymentMethodsForApi, shippingClassesForApi } from "../src/lib/gunbroker/types";
import { withGunBrokerAccess } from "../src/lib/gunbroker/service";
import { characteristicValue, pickField } from "../src/lib/gunbroker/types";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("no user");
  const existing = await prisma.listing.findFirst({
    where: { userId: user.id, itemId: "15811068" },
  });
  if (!existing) throw new Error("no template");

  await withGunBrokerAccess(user.id, async (accessToken) => {
    const item = await getItem(accessToken, existing.itemId);
    const paymentMethods = paymentMethodsForApi(parsePaymentMethods(existing.paymentMethodsJson));
    const shippingClasses = shippingClassesForApi(parseShippingClasses(existing.shippingClassesJson));

    const body: Record<string, unknown> = {
      Title: "Chamber verify test delete",
      Description: "test",
      CategoryID: pickField(item, "categoryID", "CategoryID", "categoryId"),
      Condition: 1,
      CountryCode: "US",
      Quantity: 1,
      ListingDuration: 90,
      PostalCode: "99501",
      FixedPrice: 49.99,
      InspectionPeriod: 1,
      IsFFLRequired: false,
      PaymentMethods: paymentMethods,
      WhoPaysForShipping: existing.whoPaysForShipping ?? 2,
      ShippingClassesSupported: shippingClasses,
      Characteristics: {
        manufacturerName: "Sleeping Dog Ammo",
        Caliber: "45-70",
        NumberOfRoundsPerQuantityOne: 20,
      },
      HasCharacteristics: true,
    };

    console.log("creating...");
    const payload = await createItem(accessToken, body);
    const itemId = String(pickField(payload, "itemID", "ItemID", "itemId") ?? "");
    console.log("created", itemId);

    for (const wait of [0, 1000, 3000]) {
      if (wait) await new Promise((r) => setTimeout(r, wait));
      const live = await getItem(accessToken, itemId);
      const mfg = characteristicValue(
        live,
        "manufacturer",
        "Manufacturer",
        "manufacture",
        "Manufacture",
        "manufacturerName",
      );
      const cal = characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge");
      console.log(`after ${wait}ms: mfg=${mfg} cal=${cal}`);
      console.log(
        "itemCharacteristics",
        JSON.stringify(pickField(live, "itemCharacteristics", "ItemCharacteristics")),
      );
    }

    await endItem(accessToken, itemId);
    console.log("ended", itemId);
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
