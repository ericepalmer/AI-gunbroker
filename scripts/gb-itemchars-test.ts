import { PrismaClient } from "@prisma/client";
import { createItem, endItem, getItem, getItemPictures, getListingDefaults, getAccountPayload, getContactInfo } from "../src/lib/gunbroker/client";
import { withGunBrokerAccess } from "../src/lib/gunbroker/service";
import { characteristicValue, pickField } from "../src/lib/gunbroker/types";

const prisma = new PrismaClient();

function itemCharacteristicsFromObject(obj: Record<string, unknown>) {
  return Object.entries(obj).map(([name, value]) => ({
    characteristicName: name,
    CharacteristicName: name,
    characteristicValue:
      value && typeof value === "object" && !Array.isArray(value)
        ? value
        : { "0": String(value) },
    CharacteristicValue:
      value && typeof value === "object" && !Array.isArray(value)
        ? value
        : { "0": String(value) },
  }));
}

async function main() {
  const user = await prisma.user.findFirst();
  const existing = await prisma.listing.findFirst({ where: { userId: user!.id, itemId: "15811068" } });
  if (!existing) throw new Error("no template");

  const listings = await import("../src/lib/gunbroker/listings");

  await withGunBrokerAccess(user!.id, async (token) => {
    const itemId = "15811068";
    const [item, pictureRows, defaults, account, contact] = await Promise.all([
      getItem(token, itemId),
      getItemPictures(token, itemId).catch(() => []),
      getListingDefaults(token).catch(() => null),
      getAccountPayload(token).catch(() => null),
      getContactInfo(token).catch(() => null),
    ]);

    // Build request via cloneGunBrokerListing internals by calling it but patching createItem
    const { createItem: realCreate } = await import("../src/lib/gunbroker/client");
    let captured: Record<string, unknown> | null = null;

    const mod = await import("../src/lib/gunbroker/client");
    const original = mod.createItem;
    mod.createItem = async (_t, body) => {
      captured = { ...body };
      const characteristics = (body.Characteristics ?? {}) as Record<string, unknown>;
      const withItemChars = {
        ...body,
        ItemCharacteristics: itemCharacteristicsFromObject(characteristics),
        itemCharacteristics: itemCharacteristicsFromObject(characteristics),
      };
      console.log("trying with ItemCharacteristics array...");
      try {
        return await original(token, withItemChars);
      } catch (e) {
        console.log("ItemCharacteristics failed:", e instanceof Error ? e.message.slice(0, 200) : e);
        return original(token, body);
      }
    };

    try {
      const newId = await listings.cloneGunBrokerListing(user!.id, itemId, {
        preferredTitle: "Chamber itemchars test delete",
        preferredDescription: "x",
      });
      const live = await getItem(token, newId);
      console.log(
        "result mfg",
        characteristicValue(live, "manufacturer", "Manufacturer", "manufacture", "Manufacture", "manufacturerName"),
      );
      console.log("result cal", characteristicValue(live, "caliber", "Caliber", "gauge", "Gauge"));
      console.log(JSON.stringify(pickField(live, "itemCharacteristics", "ItemCharacteristics"), null, 2));
      await endItem(token, newId);
    } finally {
      mod.createItem = original;
    }
  });
}

main().finally(() => prisma.$disconnect());
