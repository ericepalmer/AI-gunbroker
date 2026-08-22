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
  asString,
} from "../src/lib/gunbroker/types";

const TEMPLATE_ITEM_ID = "15811068";
const MANUFACTURER = "OTHER MANUFACTURER";
const CALIBER = ".44";
const ROUNDS = 50;

function itemIdFromCreatePayload(payload: unknown) {
  const direct = asString(pickField(payload, "itemID", "ItemID", "itemId"));
  if (direct && /^\d+$/.test(direct)) return direct;
  const message = asString(pickField(payload, "userMessage", "UserMessage", "message", "Message"));
  const match = message?.match(/(\d{5,})/);
  return match?.[1] ?? null;
}

function formatCharacteristics(raw: unknown) {
  if (!raw) return "(none)";
  return JSON.stringify(raw, null, 2);
}

async function main() {
  const prisma = new PrismaClient();
  const user = await prisma.user.findFirst();
  if (!user) throw new Error("No user in database.");

  const existing = await prisma.listing.findFirst({
    where: { userId: user.id, itemId: TEMPLATE_ITEM_ID },
  });
  if (!existing) throw new Error(`Template listing ${TEMPLATE_ITEM_ID} not found locally.`);

  const sent = {
    manufacturer: MANUFACTURER,
    caliber: CALIBER,
    rounds: ROUNDS,
  };

  console.log("=== GunBroker single create test ===");
  console.log("Sent:");
  console.log(JSON.stringify(sent, null, 2));

  await withGunBrokerAccess(user.id, async (token) => {
    const templateItem = await getItem(token, TEMPLATE_ITEM_ID);
    const classes = parseShippingClasses(existing.shippingClassesJson);
    const costs = parseShippingClassCosts(existing.shippingClassCostsJson);
    const paymentMethods = paymentMethodsForApi(parsePaymentMethods(existing.paymentMethodsJson));

    const createBody = {
      Title: "Chamber GB catalog test delete me",
      Description: "Single test: OTHER MANUFACTURER, .44, 50 rounds.",
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
      Manufacturer: MANUFACTURER,
      Manufacture: MANUFACTURER,
      Caliber: CALIBER,
      NumberOfRoundsPerQuantityOne: ROUNDS,
      Characteristics: {
        manufacturerName: MANUFACTURER,
        Manufacturer: MANUFACTURER,
        Manufacture: MANUFACTURER,
        Caliber: CALIBER,
        NumberOfRoundsForSale: ROUNDS,
        NumberOfRoundsPerQuantityOne: ROUNDS,
      },
    };

    console.log("\nCreate payload Characteristics:");
    console.log(JSON.stringify(createBody.Characteristics, null, 2));

    const createPayload = await createItem(token, createBody);
    const itemId = itemIdFromCreatePayload(createPayload);
    if (!itemId) {
      console.log("\nCreate response (no item id parsed):");
      console.log(JSON.stringify(createPayload, null, 2));
      throw new Error("GunBroker did not return an item id.");
    }

    console.log("\nCreated itemId:", itemId);
    console.log("Create message:", asString(pickField(createPayload, "userMessage", "UserMessage")));

    const live = await getItem(token, itemId);
    const got = {
      manufacturer: characteristicValue(
        live,
        "manufacturer",
        "Manufacturer",
        "manufacture",
        "Manufacture",
        "manufacturerName",
      ),
      caliber: characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge"),
      rounds:
        characteristicValue(live, "NumberOfRoundsForSale", "numberOfRoundsForSale") ??
        characteristicValue(live, "NumberOfRoundsPerQuantityOne", "numberOfRoundsPerQuantityOne"),
      title: asString(pickField(live, "title", "Title")),
      categoryName: asString(pickField(live, "categoryName", "CategoryName")),
      isActive: pickField(live, "isActive", "IsActive"),
    };

    console.log("\nGET back (parsed):");
    console.log(JSON.stringify(got, null, 2));

    console.log("\nGET itemCharacteristics (raw):");
    console.log(formatCharacteristics(pickField(live, "itemCharacteristics", "ItemCharacteristics")));

    console.log("\nMatch check:");
    console.log(
      JSON.stringify(
        {
          manufacturer: got.manufacturer === sent.manufacturer,
          caliber: got.caliber === sent.caliber,
          rounds: String(got.rounds) === String(sent.rounds),
        },
        null,
        2,
      ),
    );

    await endItem(token, itemId);
    console.log("\nEnded test listing", itemId);
  });

  await prisma.$disconnect();
}

main().catch((error) => {
  console.error("\nFAILED:", error instanceof Error ? error.message : error);
  process.exit(1);
});
