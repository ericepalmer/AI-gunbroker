import { PrismaClient } from "@prisma/client";
import { createItem, endItem, getItem } from "../src/lib/gunbroker/client";
import { withGunBrokerAccess } from "../src/lib/gunbroker/service";
import {
  parsePaymentMethods,
  parseShippingClasses,
  paymentMethodsForApi,
  shippingClassesForApi,
  characteristicValue,
  pickField,
} from "../src/lib/gunbroker/types";

const prisma = new PrismaClient();

async function tryCaliber(accessToken: string, existing: { whoPaysForShipping: number | null; paymentMethodsJson: string; shippingClassesJson: string }, templateItem: unknown, caliber: string) {
  const paymentMethods = paymentMethodsForApi(parsePaymentMethods(existing.paymentMethodsJson));
  const shippingClasses = shippingClassesForApi(parseShippingClasses(existing.shippingClassesJson));
  const body: Record<string, unknown> = {
    Title: "Chamber caliber test delete",
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
    ShippingClassesSupported: shippingClasses,
    Characteristics: {
      manufacturerName: "OTHER MANUFACTURER",
      Caliber: caliber,
      NumberOfRoundsPerQuantityOne: 20,
    },
    HasCharacteristics: true,
  };
  const payload = await createItem(accessToken, body);
  const itemId = String(pickField(payload, "itemID", "ItemID", "itemId") ?? "");
  const live = await getItem(accessToken, itemId);
  const stored = characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge");
  await endItem(accessToken, itemId).catch(() => undefined);
  return { caliber, stored, itemId };
}

async function main() {
  const user = await prisma.user.findFirst();
  const existing = await prisma.listing.findFirst({ where: { userId: user!.id, itemId: "15811068" } });
  await withGunBrokerAccess(user!.id, async (accessToken) => {
    const templateItem = await getItem(accessToken, "15811068");
    const candidates = [
      "45-70",
      ".45-70",
      "45-70 GOVT",
      ".45-70 GOVT",
      "45-70 GOV'T",
      ".45-70 GOV'T",
      "45-70 Government",
      ".45-70 Government",
      ".44 MAG.",
      "44 Mag",
    ];
    for (const caliber of candidates) {
      try {
        const result = await tryCaliber(accessToken, existing!, templateItem, caliber);
        console.log(result);
      } catch (e) {
        console.log({ caliber, error: e instanceof Error ? e.message : e });
      }
    }
  });
}

main().finally(() => prisma.$disconnect());
