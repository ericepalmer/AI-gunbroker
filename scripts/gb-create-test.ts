import { PrismaClient } from "@prisma/client";
import { decryptSecret } from "../src/lib/crypto";
import {
  createAccessToken,
  createItem,
  endItem,
  getCategoryCharacteristics,
  getItem,
} from "../src/lib/gunbroker/client";
import { GUNBROKER_PROVIDER } from "../src/lib/gunbroker/config";
import { asEnumId, asString, characteristicValue, pickField } from "../src/lib/gunbroker/types";

const prisma = new PrismaClient();

async function main() {
  const user = await prisma.user.findFirst();
  const integration = await prisma.integration.findUnique({
    where: { userId_provider: { userId: user!.id, provider: GUNBROKER_PROVIDER } },
  });
  const secrets = JSON.parse(decryptSecret(integration!.secretsCipher!)) as { password: string };
  const token = await createAccessToken(integration!.username!, secrets.password);

  const template = await prisma.listing.findFirst({
    where: { userId: user!.id },
    orderBy: { updatedAt: "desc" },
  });
  const woo = await prisma.wooProduct.findFirst({
    where: { manufacturer: { not: null }, caliber: { not: null } },
    orderBy: { productId: "desc" },
  });
  if (!template || !woo) throw new Error("missing template or woo");

  const templateItem = await getItem(token, template.itemId);
  const categoryId = asEnumId(pickField(templateItem, "categoryID", "CategoryID", "categoryId"));
  const catalog = categoryId
    ? await getCategoryCharacteristics(token, categoryId)
    : [];

  const templateChars = pickField(
    templateItem,
    "itemCharacteristics",
    "ItemCharacteristics",
    "characteristics",
    "Characteristics",
  );

  const characteristics: Record<string, unknown> = {};
  if (Array.isArray(templateChars)) {
    for (const entry of templateChars) {
      if (!entry || typeof entry !== "object") continue;
      const record = entry as Record<string, unknown>;
      const name = asString(pickField(record, "characteristicName", "CharacteristicName", "name", "Name"));
      const raw = pickField(record, "characteristicValue", "CharacteristicValue", "value", "Value");
      let value: string | null = null;
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
          if (/^\d+$/.test(k) && typeof v === "string") value = v;
        }
      } else if (typeof raw === "string") value = raw;
      if (name && value) characteristics[name] = value;
    }
  }

  characteristics.manufacturerName = woo.manufacturer;
  characteristics.Caliber = woo.caliber;
  if (woo.rounds != null) characteristics.NumberOfRoundsPerQuantityOne = woo.rounds;

  const body = {
    Title: "Chamber diag test delete me",
    Description: "Diagnostic listing - will be ended immediately.",
    CategoryID: categoryId,
    Condition: 1,
    CountryCode: "US",
    Quantity: 1,
    ListingDuration: 90,
    PostalCode: asString(pickField(templateItem, "postalCode", "PostalCode")) ?? "99501",
    FixedPrice: 99.99,
    InspectionPeriod: 1,
    IsFFLRequired: false,
    PaymentMethods: pickField(templateItem, "paymentMethods", "PaymentMethods"),
    ShippingClassesSupported: pickField(
      templateItem,
      "shippingClassesSupported",
      "ShippingClassesSupported",
    ),
    WhoPaysForShipping: pickField(templateItem, "whoPaysForShipping", "WhoPaysForShipping") ?? 2,
    Characteristics: characteristics,
    HasCharacteristics: true,
    Manufacturer: woo.manufacturer,
    Manufacture: woo.manufacturer,
    Caliber: woo.caliber,
  };

  console.log("Sending Characteristics:", JSON.stringify(characteristics, null, 2));

  let itemId: string | null = null;
  try {
    const payload = await createItem(token, body);
    itemId =
      asString(pickField(payload, "itemID", "ItemID", "itemId")) ??
      asString(pickField(pickField(payload, "item", "Item"), "itemID", "ItemID", "itemId"));
    console.log("create payload keys", payload && typeof payload === "object" ? Object.keys(payload as object) : payload);
    console.log("new itemId", itemId);
    if (!itemId) return;

    const live = await getItem(token, itemId);
    console.log(
      "GET manufacturer",
      characteristicValue(live, "manufacturer", "Manufacturer", "manufacture", "Manufacture", "manufacturerName"),
    );
    console.log("GET caliber", characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge"));
    console.log(
      "GET itemCharacteristics",
      JSON.stringify(pickField(live, "itemCharacteristics", "ItemCharacteristics"), null, 2),
    );
    console.log(
      "GET Characteristics",
      JSON.stringify(pickField(live, "characteristics", "Characteristics"), null, 2),
    );
  } finally {
    if (itemId) {
      try {
        await endItem(token, itemId);
        console.log("ended", itemId);
      } catch (e) {
        console.log("end failed", e);
      }
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
