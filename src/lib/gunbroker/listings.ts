import {
  addItemPictures,
  createItem,
  deleteItemPicture,
  endItem,
  getAccountPayload,
  getContactInfo,
  getItem,
  getItemPictures,
  getListingDefaults,
  listItemsSelling,
  updateItem,
} from "@/lib/gunbroker/client";
import { isGunBrokerConnected, withGunBrokerAccess } from "@/lib/gunbroker/service";
import {
  asBoolean,
  asDate,
  asEnumId,
  asEnumName,
  asMoney,
  asNumber,
  asString,
  characteristicValue,
  emptyPremiumFeatures,
  excludeStatesEqual,
  excludeStatesText,
  hasAnyPaymentMethod,
  hasAnyPremiumFeature,
  hasAnyShippingClass,
  parseAutoRelist,
  parseAutoRelistFixedCount,
  parseCondition,
  parseExcludeStates,
  parseInspectionPeriod,
  parseListingDuration,
  parsePaymentMethods,
  parsePremiumFeatures,
  parseRounds,
  parseShippingClassCosts,
  parseShippingClasses,
  parseShippingProfileId,
  parseWeightUnit,
  parseWhoPaysForShipping,
  paymentMethodsEqual,
  paymentMethodsForApi,
  pickField,
  premiumFeaturesEqual,
  premiumFeaturesForApi,
  shippingClassCostsEqual,
  shippingClassCostsForApi,
  shippingClassesEqual,
  shippingClassesForApi,
  type ListingCard,
  type ListingDetail,
  type ListingEdits,
  type ListingPicture,
  type PaymentMethods,
  type PremiumFeatures,
  type ShippingClassCosts,
  type ShippingClasses,
} from "@/lib/gunbroker/types";
import { prisma } from "@/lib/prisma";

function itemIdOf(item: unknown) {
  return asString(pickField(item, "itemID", "ItemID", "itemId"));
}

function isFixedPriceOf(item: unknown) {
  const flagged = asBoolean(pickField(item, "isFixedPrice", "IsFixedPrice"));
  if (flagged != null) return flagged;
  return asMoney(pickField(item, "fixedPrice", "FixedPrice")) != null;
}

function priceOf(item: unknown, isFixedPrice: boolean) {
  const fixed = asMoney(pickField(item, "fixedPrice", "FixedPrice"));
  const buyNow = asMoney(pickField(item, "buyNowPrice", "BuyNowPrice"));
  const starting = asMoney(
    pickField(item, "startingBid", "StartingBid", "minimumBid", "MinimumBid"),
  );
  const current = asMoney(pickField(item, "currentBid", "CurrentBid"));
  if (isFixedPrice) return fixed ?? buyNow ?? starting;
  return buyNow ?? current ?? starting ?? fixed;
}

function endingAtOf(item: unknown) {
  return asDate(
    pickField(
      item,
      "endingDateTimeUTC",
      "EndingDateTimeUTC",
      "expirationDate",
      "ExpirationDate",
      "endingDateTime",
      "EndingDateTime",
    ),
  );
}

function pictureIdOf(value: unknown) {
  return asString(
    pickField(value, "pictureID", "PictureID", "pictureId", "id", "ID"),
  );
}

function picturesFromItem(item: unknown): ListingPicture[] {
  const raw = pickField(item, "pictures", "Pictures");
  if (!Array.isArray(raw)) return [];
  return raw.flatMap((entry, index) => {
    const url =
      typeof entry === "string"
        ? asString(entry)
        : asString(pickField(entry, "pictureURL", "PictureURL", "url", "URL"));
    if (!url) return [];
    return [
      {
        url,
        pictureId: typeof entry === "string" ? null : pictureIdOf(entry),
        displayOrder:
          asNumber(pickField(entry, "displayOrder", "DisplayOrder")) ?? index + 1,
      },
    ];
  });
}

function picturesFromRows(rows: unknown[]): ListingPicture[] {
  return rows
    .flatMap((row, index) => {
      const url = asString(pickField(row, "pictureURL", "PictureURL", "url", "URL"));
      if (!url) return [];
      return [
        {
          url,
          pictureId: pictureIdOf(row),
          displayOrder:
            asNumber(pickField(row, "displayOrder", "DisplayOrder")) ?? index + 1,
        },
      ];
    })
    .sort((a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0));
}

function parsePictures(json: string | null): ListingPicture[] {
  if (!json) return [];
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((entry) => {
      if (!entry || typeof entry !== "object") return [];
      const record = entry as Record<string, unknown>;
      const url = asString(record.url);
      if (!url) return [];
      return [
        {
          url,
          pictureId: asString(record.pictureId),
          displayOrder: asNumber(record.displayOrder),
        },
      ];
    });
  } catch {
    return [];
  }
}

function uniquePictures(...groups: ListingPicture[][]) {
  const seen = new Set<string>();
  const next: ListingPicture[] = [];
  for (const group of groups) {
    for (const picture of group) {
      if (seen.has(picture.url)) continue;
      seen.add(picture.url);
      next.push(picture);
    }
  }
  return next;
}

type MappedListing = {
  itemId: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  pictures: ListingPicture[];
  quantity: number;
  startingBid: number | null;
  buyNowPrice: number | null;
  fixedPrice: number | null;
  isFixedPrice: boolean;
  price: number | null;
  endingAt: Date | null;
  sku: string | null;
  upc: string | null;
  reservePrice: number | null;
  collectorsElite: boolean;
  paymentMethods: PaymentMethods;
  whoPaysForShipping: number | null;
  shippingProfileId: number | null;
  shippingClasses: ShippingClasses;
  shippingClassCosts: ShippingClassCosts;
  condition: number | null;
  isFflRequired: boolean | null;
  weight: number | null;
  weightUnit: number | null;
  inspectionPeriod: number | null;
  manufacturer: string | null;
  caliber: string | null;
  rounds: number | null;
  mfgPartNumber: string | null;
  serialNumber: string | null;
  gtin: string | null;
  excludeStates: string[];
  listingDuration: number | null;
  autoRelist: number | null;
  autoRelistFixedCount: number | null;
  premiumFeatures: PremiumFeatures;
};

function shippingFromItem(item: unknown) {
  const classes = parseShippingClasses(
    pickField(item, "shippingClassesSupported", "ShippingClassesSupported"),
  );
  const costs = parseShippingClassCosts(
    pickField(
      item,
      "shippingClassCosts",
      "ShippingClassCosts",
      "shippingClassCost",
      "ShippingClassCost",
    ),
  );
  for (const key of Object.keys(costs) as (keyof ShippingClassCosts)[]) {
    if (costs[key] != null) classes[key] = true;
  }
  return {
    whoPaysForShipping: parseWhoPaysForShipping(
      pickField(item, "whoPaysForShipping", "WhoPaysForShipping"),
    ),
    shippingProfileId: parseShippingProfileId(
      pickField(item, "shippingProfileID", "ShippingProfileID", "shippingProfileId"),
    ),
    shippingClasses: classes,
    shippingClassCosts: costs,
  };
}

function parseWeight(value: unknown) {
  const next = asNumber(value);
  if (next == null || next <= 0) return null;
  return next;
}

function itemFlagsFromItem(item: unknown) {
  return {
    condition: parseCondition(pickField(item, "condition", "Condition")),
    isFflRequired: asBoolean(
      pickField(
        item,
        "isFFLRequired",
        "IsFFLRequired",
        "fflRequired",
        "FFLRequired",
      ),
    ),
    weight: parseWeight(pickField(item, "weight", "Weight")),
    weightUnit: parseWeightUnit(pickField(item, "weightUnit", "WeightUnit")),
    inspectionPeriod: parseInspectionPeriod(
      pickField(item, "inspectionPeriod", "InspectionPeriod"),
    ),
  };
}

function itemDetailsFromItem(item: unknown) {
  const autoRelistRaw = pickField(item, "autoRelist", "AutoRelist");
  const autoRelist = parseAutoRelist(autoRelistRaw);
  return {
    manufacturer:
      asEnumName(pickField(item, "manufacturer", "Manufacturer")) ??
      asEnumName(characteristicValue(item, "manufacturer", "Manufacturer")),
    caliber:
      asEnumName(pickField(item, "caliber", "Caliber", "gauge", "Gauge")) ??
      asEnumName(characteristicValue(item, "caliber", "Caliber", "gauge", "Gauge")),
    rounds:
      parseRounds(pickField(item, "numberOfRounds", "NumberOfRounds")) ??
      parseRounds(
        characteristicValue(
          item,
          "NumberOfRoundsPerQuantityOne",
          "numberOfRoundsPerQuantityOne",
          "NumberOfRounds",
        ),
      ),
    mfgPartNumber: asString(
      pickField(item, "mfgPartNumber", "MfgPartNumber", "mpn", "MPN", "MFGPartNumber"),
    ),
    serialNumber: asString(pickField(item, "serialNumber", "SerialNumber")),
    gtin: asString(pickField(item, "gtin", "GTIN")),
    excludeStates: parseExcludeStates(
      pickField(
        item,
        "excludeStates",
        "ExcludeStates",
        "excludedStates",
        "ExcludedStates",
        "statesExcluded",
      ),
    ),
    listingDuration: parseListingDuration(
      pickField(item, "listingDuration", "ListingDuration", "duration", "Duration"),
    ),
    autoRelist,
    autoRelistFixedCount:
      parseAutoRelistFixedCount(
        pickField(item, "autoRelistFixedCount", "AutoRelistFixedCount"),
        autoRelist,
      ) ?? parseAutoRelistFixedCount(autoRelistRaw, autoRelist),
  };
}

type ItemDetails = {
  manufacturer: string | null;
  caliber: string | null;
  rounds: number | null;
  mfgPartNumber: string | null;
  serialNumber: string | null;
  gtin: string | null;
  excludeStates: string[];
  listingDuration: number | null;
  autoRelist: number | null;
  autoRelistFixedCount: number | null;
};

function detailsForCreate(details: ItemDetails) {
  return {
    manufacturer: details.manufacturer,
    caliber: details.caliber,
    rounds: details.rounds,
    mfgPartNumber: details.mfgPartNumber,
    serialNumber: details.serialNumber,
    gtin: details.gtin,
    excludeStates: excludeStatesText(details.excludeStates),
    listingDuration: details.listingDuration,
    autoRelist: details.autoRelist,
    autoRelistFixedCount: details.autoRelistFixedCount,
  };
}

function detailsForUpdate(details: ItemDetails) {
  return {
    manufacturer: details.manufacturer ?? undefined,
    caliber: details.caliber ?? undefined,
    rounds: details.rounds ?? undefined,
    mfgPartNumber: details.mfgPartNumber ?? undefined,
    serialNumber: details.serialNumber ?? undefined,
    gtin: details.gtin ?? undefined,
    excludeStates: details.excludeStates.length
      ? excludeStatesText(details.excludeStates)
      : undefined,
    listingDuration: details.listingDuration ?? undefined,
    autoRelist: details.autoRelist ?? undefined,
    autoRelistFixedCount: details.autoRelistFixedCount ?? undefined,
  };
}

function detailsForRefresh(
  details: ItemDetails,
  existing: {
    manufacturer: string | null;
    caliber: string | null;
    rounds: number | null;
    mfgPartNumber: string | null;
    serialNumber: string | null;
    gtin: string | null;
    excludeStates: string;
    listingDuration: number | null;
    autoRelist: number | null;
    autoRelistFixedCount: number | null;
  },
) {
  return {
    manufacturer: details.manufacturer ?? existing.manufacturer,
    caliber: details.caliber ?? existing.caliber,
    rounds: details.rounds ?? existing.rounds,
    mfgPartNumber: details.mfgPartNumber ?? existing.mfgPartNumber,
    serialNumber: details.serialNumber ?? existing.serialNumber,
    gtin: details.gtin ?? existing.gtin,
    excludeStates: details.excludeStates.length
      ? excludeStatesText(details.excludeStates)
      : existing.excludeStates,
    listingDuration: details.listingDuration ?? existing.listingDuration,
    autoRelist: details.autoRelist ?? existing.autoRelist,
    autoRelistFixedCount:
      details.autoRelistFixedCount ?? existing.autoRelistFixedCount,
  };
}

function mapSummary(item: unknown): MappedListing | null {
  const itemId = itemIdOf(item);
  const title = asString(pickField(item, "title", "Title"));
  if (!itemId || !title) return null;
  const isFixedPrice = isFixedPriceOf(item);
  const thumbnailUrl = asString(
    pickField(item, "thumbnailURL", "ThumbnailURL", "thumbnailUrl"),
  );
  const pictures = picturesFromItem(item);
  const shipping = shippingFromItem(item);
  const flags = itemFlagsFromItem(item);
  const details = itemDetailsFromItem(item);
  return {
    itemId,
    title,
    subtitle: asString(pickField(item, "subTitle", "SubTitle", "subtitle")),
    description: asString(
      pickField(item, "descriptionOnly", "DescriptionOnly", "description", "Description"),
    ),
    thumbnailUrl: thumbnailUrl ?? pictures[0]?.url ?? null,
    pictures,
    quantity: Math.max(1, Math.round(asNumber(pickField(item, "quantity", "Quantity")) ?? 1)),
    startingBid: asMoney(
      pickField(item, "startingBid", "StartingBid", "minimumBid", "MinimumBid"),
    ),
    buyNowPrice: asMoney(pickField(item, "buyNowPrice", "BuyNowPrice")),
    fixedPrice: asMoney(pickField(item, "fixedPrice", "FixedPrice")),
    isFixedPrice,
    price: priceOf(item, isFixedPrice),
    endingAt: endingAtOf(item),
    sku: asString(pickField(item, "sku", "SKU")),
    upc: asString(pickField(item, "upc", "UPC")),
    reservePrice: asMoney(pickField(item, "reservePrice", "ReservePrice")),
    collectorsElite:
      asBoolean(
        pickField(item, "collectorsElite", "CollectorsElite", "isCollectorsElite", "IsCollectorsElite"),
      ) ?? false,
    paymentMethods: parsePaymentMethods(pickField(item, "paymentMethods", "PaymentMethods")),
    premiumFeatures: parsePremiumFeatures(item),
    ...shipping,
    condition: flags.condition,
    isFflRequired: flags.isFflRequired,
    weight: flags.weight,
    weightUnit: flags.weightUnit,
    inspectionPeriod: flags.inspectionPeriod,
    ...details,
  };
}

function toCard(row: {
  itemId: string;
  title: string;
  thumbnailUrl: string | null;
  endingAt: Date | null;
  quantity: number;
  price: number | null;
  isFixedPrice: boolean;
  subtitle: string | null;
  reservePrice: number | null;
  listingDuration: number | null;
  premiumFeaturesJson: string;
}): ListingCard {
  return {
    itemId: row.itemId,
    title: row.title,
    thumbnailUrl: row.thumbnailUrl,
    endingAt: row.endingAt?.toISOString() ?? null,
    quantity: row.quantity,
    price: row.price,
    isFixedPrice: row.isFixedPrice,
    subtitle: row.subtitle,
    reservePrice: row.reservePrice,
    listingDuration: row.listingDuration,
    premiumFeatures: parsePremiumFeatures(row.premiumFeaturesJson),
  };
}

function toDetail(row: {
  itemId: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  thumbnailUrl: string | null;
  picturesJson: string;
  quantity: number;
  price: number | null;
  startingBid: number | null;
  buyNowPrice: number | null;
  fixedPrice: number | null;
  isFixedPrice: boolean;
  endingAt: Date | null;
  sku: string | null;
  upc: string | null;
  reservePrice: number | null;
  collectorsElite: boolean;
  paymentMethodsJson: string;
  whoPaysForShipping: number | null;
  shippingProfileId: number | null;
  shippingClassesJson: string;
  shippingClassCostsJson: string;
  condition: number | null;
  isFflRequired: boolean;
  weight: number | null;
  weightUnit: number | null;
  inspectionPeriod: number | null;
  manufacturer: string | null;
  caliber: string | null;
  rounds: number | null;
  mfgPartNumber: string | null;
  serialNumber: string | null;
  gtin: string | null;
  excludeStates: string;
  listingDuration: number | null;
  autoRelist: number | null;
  autoRelistFixedCount: number | null;
  premiumFeaturesJson: string;
  lastImportedAt: Date;
}): ListingDetail {
  const pictures = parsePictures(row.picturesJson);
  const shippingClasses = parseShippingClasses(row.shippingClassesJson);
  const shippingClassCosts = parseShippingClassCosts(row.shippingClassCostsJson);
  return {
    ...toCard(row),
    subtitle: row.subtitle,
    description: row.description,
    pictures,
    thumbnailUrl: row.thumbnailUrl ?? pictures[0]?.url ?? null,
    startingBid: row.startingBid,
    buyNowPrice: row.buyNowPrice,
    fixedPrice: row.fixedPrice,
    sku: row.sku,
    upc: row.upc,
    reservePrice: row.reservePrice,
    collectorsElite: row.collectorsElite,
    paymentMethods: parsePaymentMethods(row.paymentMethodsJson),
    whoPaysForShipping: row.whoPaysForShipping,
    shippingProfileId: row.shippingProfileId,
    shippingClasses,
    shippingClassCosts,
    condition: row.condition,
    isFflRequired: row.isFflRequired,
    weight: row.weight,
    weightUnit: row.weightUnit,
    inspectionPeriod: row.inspectionPeriod,
    manufacturer: row.manufacturer,
    caliber: row.caliber,
    rounds: row.rounds,
    mfgPartNumber: row.mfgPartNumber,
    serialNumber: row.serialNumber,
    gtin: row.gtin,
    excludeStates: parseExcludeStates(row.excludeStates),
    listingDuration: row.listingDuration,
    autoRelist: row.autoRelist,
    autoRelistFixedCount: row.autoRelistFixedCount,
    premiumFeatures: parsePremiumFeatures(row.premiumFeaturesJson),
    lastImportedAt: row.lastImportedAt.toISOString(),
  };
}

export async function listLocalInventory(userId: string) {
  const rows = await prisma.listing.findMany({
    where: { userId },
    orderBy: [{ endingAt: "asc" }, { title: "asc" }],
  });
  return rows.map(toCard);
}

export async function importGunBrokerInventory(userId: string) {
  if (!(await isGunBrokerConnected(userId))) {
    throw new Error("Connect GunBroker in Settings before importing listings.");
  }

  const items: NonNullable<ReturnType<typeof mapSummary>>[] = [];
  await withGunBrokerAccess(userId, async (accessToken) => {
    let pageIndex = 1;
    const pageSize = 300;
    while (true) {
      const page = await listItemsSelling(accessToken, pageIndex, pageSize);
      for (const item of page.results) {
        const mapped = mapSummary(item);
        if (mapped) items.push(mapped);
      }
      if (page.results.length < pageSize || items.length >= page.count) break;
      pageIndex += 1;
      if (pageIndex > 50) break;
    }
  });

  const now = new Date();
  const itemIds = items.map((item) => item.itemId);

  await prisma.$transaction(async (tx) => {
    for (const item of items) {
      await tx.listing.upsert({
        where: { userId_itemId: { userId, itemId: item.itemId } },
        create: {
          userId,
          itemId: item.itemId,
          title: item.title,
          subtitle: item.subtitle,
          description: item.description,
          thumbnailUrl: item.thumbnailUrl,
          picturesJson: JSON.stringify(item.pictures),
          quantity: item.quantity,
          price: item.price,
          startingBid: item.startingBid,
          buyNowPrice: item.buyNowPrice,
          fixedPrice: item.fixedPrice,
          isFixedPrice: item.isFixedPrice,
          endingAt: item.endingAt,
          sku: item.sku,
          upc: item.upc,
          reservePrice: item.reservePrice,
          collectorsElite: item.collectorsElite,
          paymentMethodsJson: JSON.stringify(item.paymentMethods),
          premiumFeaturesJson: JSON.stringify(item.premiumFeatures),
          whoPaysForShipping: item.whoPaysForShipping,
          shippingProfileId: item.shippingProfileId,
          shippingClassesJson: JSON.stringify(item.shippingClasses),
          shippingClassCostsJson: JSON.stringify(item.shippingClassCosts),
          condition: item.condition,
          isFflRequired: item.isFflRequired ?? false,
          weight: item.weight,
          weightUnit: item.weightUnit,
          inspectionPeriod: item.inspectionPeriod,
          ...detailsForCreate(item),
          lastImportedAt: now,
        },
        update: {
          title: item.title,
          subtitle: item.subtitle,
          description: item.description ?? undefined,
          thumbnailUrl: item.thumbnailUrl,
          picturesJson: item.pictures.length ? JSON.stringify(item.pictures) : undefined,
          quantity: item.quantity,
          price: item.price,
          startingBid: item.startingBid,
          buyNowPrice: item.buyNowPrice,
          fixedPrice: item.fixedPrice,
          isFixedPrice: item.isFixedPrice,
          endingAt: item.endingAt,
          sku: item.sku,
          upc: item.upc,
          reservePrice: item.reservePrice,
          collectorsElite: item.collectorsElite,
          paymentMethodsJson: hasAnyPaymentMethod(item.paymentMethods)
            ? JSON.stringify(item.paymentMethods)
            : undefined,
          premiumFeaturesJson: hasAnyPremiumFeature(item.premiumFeatures)
            ? JSON.stringify(item.premiumFeatures)
            : undefined,
          whoPaysForShipping: item.whoPaysForShipping ?? undefined,
          shippingProfileId: item.shippingProfileId ?? undefined,
          shippingClassesJson: hasAnyShippingClass(item.shippingClasses)
            ? JSON.stringify(item.shippingClasses)
            : undefined,
          shippingClassCostsJson: hasAnyShippingClass(item.shippingClasses)
            ? JSON.stringify(item.shippingClassCosts)
            : undefined,
          condition: item.condition ?? undefined,
          isFflRequired: item.isFflRequired ?? undefined,
          weight: item.weight ?? undefined,
          weightUnit: item.weightUnit ?? undefined,
          inspectionPeriod: item.inspectionPeriod ?? undefined,
          ...detailsForUpdate(item),
          lastImportedAt: now,
        },
      });
    }
    await tx.listing.deleteMany({
      where: {
        userId,
        itemId: { notIn: itemIds.length ? itemIds : ["__none__"] },
      },
    });
  });

  return { count: items.length };
}

export async function getListingDetail(userId: string, itemId: string) {
  const existing = await prisma.listing.findUnique({
    where: { userId_itemId: { userId, itemId } },
  });
  if (!existing) return null;

  try {
    const refreshed = await withGunBrokerAccess(userId, async (accessToken) => {
      const [item, pictureResult] = await Promise.all([
        getItem(accessToken, itemId),
        getItemPictures(accessToken, itemId)
          .then((rows) => ({ ok: true as const, rows }))
          .catch(() => ({ ok: false as const, rows: [] as unknown[] })),
      ]);
      return { item, pictureResult };
    });
    const mapped = mapSummary(refreshed.item);
    if (!mapped) return toDetail(existing);
    const pictures = refreshed.pictureResult.ok
      ? picturesFromRows(refreshed.pictureResult.rows)
      : uniquePictures(
          picturesFromItem(refreshed.item),
          mapped.thumbnailUrl
            ? [{ url: mapped.thumbnailUrl, pictureId: null, displayOrder: 1 }]
            : [],
        );
    const row = await prisma.listing.update({
      where: { userId_itemId: { userId, itemId } },
      data: {
        title: mapped.title,
        subtitle: mapped.subtitle,
        description: mapped.description ?? existing.description,
        thumbnailUrl: refreshed.pictureResult.ok
          ? pictures[0]?.url ?? null
          : (mapped.thumbnailUrl ?? pictures[0]?.url ?? existing.thumbnailUrl),
        picturesJson: JSON.stringify(pictures),
        quantity: mapped.quantity,
        price: mapped.price,
        startingBid: mapped.startingBid,
        buyNowPrice: mapped.buyNowPrice,
        fixedPrice: mapped.fixedPrice,
        isFixedPrice: mapped.isFixedPrice,
        endingAt: mapped.endingAt,
        sku: mapped.sku,
        upc: mapped.upc,
        reservePrice: mapped.reservePrice,
        collectorsElite: mapped.collectorsElite,
        paymentMethodsJson: hasAnyPaymentMethod(mapped.paymentMethods)
          ? JSON.stringify(mapped.paymentMethods)
          : existing.paymentMethodsJson,
        premiumFeaturesJson: hasAnyPremiumFeature(mapped.premiumFeatures)
          ? JSON.stringify(mapped.premiumFeatures)
          : existing.premiumFeaturesJson,
        whoPaysForShipping: mapped.whoPaysForShipping ?? existing.whoPaysForShipping,
        shippingProfileId: mapped.shippingProfileId ?? existing.shippingProfileId,
        shippingClassesJson: hasAnyShippingClass(mapped.shippingClasses)
          ? JSON.stringify(mapped.shippingClasses)
          : existing.shippingClassesJson,
        shippingClassCostsJson: hasAnyShippingClass(mapped.shippingClasses)
          ? JSON.stringify(mapped.shippingClassCosts)
          : existing.shippingClassCostsJson,
        condition: mapped.condition ?? existing.condition,
        isFflRequired: mapped.isFflRequired ?? existing.isFflRequired,
        weight: mapped.weight ?? existing.weight,
        weightUnit: mapped.weightUnit ?? existing.weightUnit,
        inspectionPeriod: mapped.inspectionPeriod ?? existing.inspectionPeriod,
        ...detailsForRefresh(mapped, existing),
        lastImportedAt: new Date(),
      },
    });
    return toDetail(row);
  } catch {
    return toDetail(existing);
  }
}

function moneyChanged(next: number | null, current: number | null) {
  if (next == null && current == null) return false;
  if (next == null || current == null) return true;
  return Math.abs(next - current) > 0.001;
}

export async function commitListing(
  userId: string,
  itemId: string,
  edits: ListingEdits,
  pictureChanges?: { removePictureIds: string[]; added: File[] },
) {
  const existing = await prisma.listing.findUnique({
    where: { userId_itemId: { userId, itemId } },
  });
  if (!existing) {
    throw new Error("That listing is not in your inventory. Import from GunBroker first.");
  }

  const title = normalizeGunBrokerTitle(edits.title);
  const subtitle = edits.subtitle.trim();
  if (subtitle.length > 50) throw new Error("Subtitle must be 50 characters or fewer.");
  const quantity = Math.max(1, Math.round(edits.quantity));
  const removePictureIds = (pictureChanges?.removePictureIds ?? []).filter(Boolean);
  const added = pictureChanges?.added ?? [];
  const hasPictureChanges = removePictureIds.length > 0 || added.length > 0;

  const body: Record<string, unknown> = {};
  if (title !== existing.title) body.Title = title;
  if (subtitle !== (existing.subtitle ?? "")) body.SubTitle = subtitle;
  if ((edits.description ?? "") !== (existing.description ?? "")) {
    body.Description = edits.description;
  }
  if (quantity !== existing.quantity) body.Quantity = quantity;
  if (edits.sku.trim() !== (existing.sku ?? "")) body.SKU = edits.sku.trim();
  if (edits.upc.trim() !== (existing.upc ?? "")) body.UPC = edits.upc.trim();
  if (edits.collectorsElite !== existing.collectorsElite) {
    body.CollectorsElite = edits.collectorsElite;
  }
  const existingPremium = parsePremiumFeatures(existing.premiumFeaturesJson);
  const nextPremium = {
    ...emptyPremiumFeatures(),
    ...edits.premiumFeatures,
  };
  if (!premiumFeaturesEqual(nextPremium, existingPremium)) {
    if (nextPremium.isScheduled && !nextPremium.scheduledStartingAt) {
      throw new Error("Choose a start time for the scheduled listing.");
    }
    body.PremiumFeatures = premiumFeaturesForApi(nextPremium);
  }
  if (
    !paymentMethodsEqual(
      edits.paymentMethods,
      parsePaymentMethods(existing.paymentMethodsJson),
    )
  ) {
    if (!hasAnyPaymentMethod(edits.paymentMethods)) {
      throw new Error("Choose at least one payment option.");
    }
    body.PaymentMethods = paymentMethodsForApi(edits.paymentMethods);
  }
  const existingClasses = parseShippingClasses(existing.shippingClassesJson);
  const existingCosts = parseShippingClassCosts(existing.shippingClassCostsJson);
  const usingProfile =
    edits.whoPaysForShipping === 16 && edits.shippingProfileId != null;
  const shippingChanged =
    edits.whoPaysForShipping !== existing.whoPaysForShipping ||
    edits.shippingProfileId !== existing.shippingProfileId ||
    !shippingClassesEqual(edits.shippingClasses, existingClasses) ||
    !shippingClassCostsEqual(edits.shippingClassCosts, existingCosts);
  if (shippingChanged) {
    if (!usingProfile && !hasAnyShippingClass(edits.shippingClasses)) {
      throw new Error("Choose at least one shipping class.");
    }
    applyShippingToBody(body, edits);
  }
  if (edits.condition != null && edits.condition !== existing.condition) {
    body.Condition = edits.condition;
  }
  if (edits.isFflRequired !== existing.isFflRequired) {
    body.IsFFLRequired = edits.isFflRequired;
  }
  if (
    edits.weight != null &&
    (moneyChanged(edits.weight, existing.weight) ||
      (edits.weightUnit ?? 1) !== (existing.weightUnit ?? 1))
  ) {
    body.Weight = edits.weight;
    body.WeightUnit = edits.weightUnit ?? 1;
  }
  if (
    edits.inspectionPeriod != null &&
    edits.inspectionPeriod !== existing.inspectionPeriod
  ) {
    body.InspectionPeriod = edits.inspectionPeriod;
  }
  const manufacturer = (edits.manufacturer ?? "").trim();
  const caliber = (edits.caliber ?? "").trim();
  const mfgPartNumber = (edits.mfgPartNumber ?? "").trim();
  const serialNumber = (edits.serialNumber ?? "").trim();
  const gtin = (edits.gtin ?? "").trim();
  if (manufacturer !== (existing.manufacturer ?? "")) body.Manufacturer = manufacturer;
  if (caliber !== (existing.caliber ?? "")) body.Caliber = caliber;
  if (mfgPartNumber !== (existing.mfgPartNumber ?? "")) {
    body.MfgPartNumber = mfgPartNumber;
  }
  if (serialNumber !== (existing.serialNumber ?? "")) body.SerialNumber = serialNumber;
  if (gtin !== (existing.gtin ?? "")) body.GTIN = gtin;
  if (
    manufacturer !== (existing.manufacturer ?? "") ||
    caliber !== (existing.caliber ?? "") ||
    edits.rounds !== existing.rounds
  ) {
    const characteristics = overlayCharacteristics(null, {
      manufacturer: manufacturer || null,
      caliber: caliber || null,
      rounds: edits.rounds,
    });
    if (characteristics) body.Characteristics = characteristics;
  }
  if (
    edits.listingDuration != null &&
    edits.listingDuration !== existing.listingDuration
  ) {
    body.ListingDuration = edits.listingDuration;
  }
  if (
    edits.autoRelist != null &&
    (edits.autoRelist !== existing.autoRelist ||
      edits.autoRelistFixedCount !== existing.autoRelistFixedCount)
  ) {
    body.AutoRelist = edits.autoRelist;
    if (edits.autoRelist === 3) {
      if (edits.autoRelistFixedCount == null || edits.autoRelistFixedCount < 1) {
        throw new Error("Enter how many times to auto-relist.");
      }
      body.AutoRelistFixedCount = edits.autoRelistFixedCount;
    }
  }
  if (
    !excludeStatesEqual(
      edits.excludeStates ?? [],
      parseExcludeStates(existing.excludeStates),
    )
  ) {
    if (edits.excludeStates.length) {
      body.UseDefaultExcludeStates = false;
      body.ExcludeStates = excludeStatesText(edits.excludeStates);
    } else {
      body.UseDefaultExcludeStates = true;
    }
  }
  if (existing.isFixedPrice) {
    if (moneyChanged(edits.fixedPrice, existing.fixedPrice)) {
      if (edits.fixedPrice == null) throw new Error("Fixed price is required.");
      body.FixedPrice = edits.fixedPrice;
    }
  } else {
    if (moneyChanged(edits.startingBid, existing.startingBid)) {
      if (edits.startingBid == null) throw new Error("Starting bid is required.");
      body.StartingBid = edits.startingBid;
    }
    if (moneyChanged(edits.buyNowPrice, existing.buyNowPrice)) {
      body.BuyNowPrice = edits.buyNowPrice ?? 0;
    }
    if (moneyChanged(edits.reservePrice, existing.reservePrice)) {
      body.ReservePrice = edits.reservePrice ?? 0;
    }
  }

  if (Object.keys(body).length === 0 && !hasPictureChanges) {
    return toDetail(existing);
  }

  const nextPictures = await withGunBrokerAccess(userId, async (accessToken) => {
    if (Object.keys(body).length) {
      await updateItem(accessToken, itemId, body);
    }
    for (const pictureId of removePictureIds) {
      try {
        await deleteItemPicture(accessToken, pictureId);
      } catch (error) {
        const message = error instanceof Error ? error.message : "";
        if (!/not found|invalid|does not exist/i.test(message)) throw error;
      }
    }
    for (let index = 0; index < added.length; index += 8) {
      await addItemPictures(accessToken, itemId, added.slice(index, index + 8));
    }
    if (!hasPictureChanges) return null;
    return picturesFromRows(await getItemPictures(accessToken, itemId));
  });

  const price = existing.isFixedPrice
    ? (edits.fixedPrice ?? existing.price)
    : (edits.buyNowPrice ?? edits.startingBid ?? existing.price);

  const remainingPictures =
    nextPictures ??
    parsePictures(existing.picturesJson).filter(
      (picture) => !picture.pictureId || !removePictureIds.includes(picture.pictureId),
    );

  const row = await prisma.listing.update({
    where: { userId_itemId: { userId, itemId } },
    data: {
      title,
      subtitle: subtitle || null,
      description: edits.description,
      quantity,
      startingBid: existing.isFixedPrice ? existing.startingBid : edits.startingBid,
      buyNowPrice: existing.isFixedPrice ? existing.buyNowPrice : edits.buyNowPrice,
      fixedPrice: existing.isFixedPrice ? edits.fixedPrice : existing.fixedPrice,
      price,
      sku: edits.sku.trim() || null,
      upc: edits.upc.trim() || null,
      reservePrice: existing.isFixedPrice ? existing.reservePrice : edits.reservePrice,
      collectorsElite: edits.collectorsElite,
      premiumFeaturesJson: JSON.stringify(nextPremium),
      paymentMethodsJson: JSON.stringify(edits.paymentMethods),
      whoPaysForShipping: edits.whoPaysForShipping,
      shippingProfileId: edits.shippingProfileId,
      shippingClassesJson: JSON.stringify(edits.shippingClasses),
      shippingClassCostsJson: JSON.stringify(edits.shippingClassCosts),
      condition: edits.condition,
      isFflRequired: edits.isFflRequired,
      weight: edits.weight,
      weightUnit: edits.weightUnit,
      inspectionPeriod: edits.inspectionPeriod,
      manufacturer: manufacturer || null,
      caliber: caliber || null,
      rounds: edits.rounds,
      mfgPartNumber: mfgPartNumber || null,
      serialNumber: serialNumber || null,
      gtin: gtin || null,
      excludeStates: excludeStatesText(edits.excludeStates ?? []),
      listingDuration: edits.listingDuration,
      autoRelist: edits.autoRelist,
      autoRelistFixedCount:
        edits.autoRelist === 3 ? edits.autoRelistFixedCount : null,
      picturesJson: hasPictureChanges ? JSON.stringify(remainingPictures) : undefined,
      thumbnailUrl: hasPictureChanges
        ? remainingPictures[0]?.url ?? null
        : undefined,
      lastCommittedAt: new Date(),
    },
  });

  return (await getListingDetail(userId, itemId)) ?? toDetail(row);
}

export async function commitListingQuick(
  userId: string,
  itemId: string,
  input: { quantity: number; price: number | null },
) {
  const existing = await prisma.listing.findUnique({
    where: { userId_itemId: { userId, itemId } },
  });
  if (!existing) {
    throw new Error("That listing is not in your inventory. Import from GunBroker first.");
  }

  const quantity = Math.max(1, Math.round(input.quantity));
  const body: Record<string, unknown> = {};
  if (quantity !== existing.quantity) body.Quantity = quantity;
  if (moneyChanged(input.price, existing.price)) {
    if (input.price == null) throw new Error("Price is required.");
    if (existing.isFixedPrice) body.FixedPrice = input.price;
    else if (existing.buyNowPrice != null) body.BuyNowPrice = input.price;
    else body.StartingBid = input.price;
  }

  if (Object.keys(body).length === 0) return;

  await withGunBrokerAccess(userId, async (accessToken) => {
    await updateItem(accessToken, itemId, body);
  });

  await prisma.listing.update({
    where: { userId_itemId: { userId, itemId } },
    data: {
      quantity,
      price: input.price,
      fixedPrice: existing.isFixedPrice ? input.price : existing.fixedPrice,
      buyNowPrice:
        !existing.isFixedPrice && existing.buyNowPrice != null
          ? input.price
          : existing.buyNowPrice,
      startingBid:
        !existing.isFixedPrice && existing.buyNowPrice == null
          ? input.price
          : existing.startingBid,
      lastCommittedAt: new Date(),
    },
  });
}

function toTitleCaseWords(value: string) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word) => {
      if (!word) return word;
      return `${word[0]!.toUpperCase()}${word.slice(1)}`;
    })
    .join(" ");
}

/** GunBroker title rules: <=75 chars, no quotes/asterisks, no all-caps. */
export function normalizeGunBrokerTitle(value: string) {
  const stripped = value
    .replace(/<[^>]*>/g, " ")
    .replace(/["'`*]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  if (!stripped) throw new Error("Title is required.");

  const hasLower = /[a-z]/.test(stripped);
  const hasUpper = /[A-Z]/.test(stripped);
  const normalized = hasUpper && !hasLower ? toTitleCaseWords(stripped) : stripped;
  const finalTitle = normalized.slice(0, 75).trim();
  if (!finalTitle) throw new Error("Title is required.");
  return finalTitle;
}

function cloneTitle(templateTitle: string, preferredTitle?: string | null) {
  if (preferredTitle?.trim()) return normalizeGunBrokerTitle(preferredTitle);
  const suffix = " clone";
  const base = templateTitle.trim();
  const withSuffix =
    base.length + suffix.length <= 75
      ? `${base}${suffix}`
      : `${base.slice(0, 75 - suffix.length)}${suffix}`;
  return normalizeGunBrokerTitle(withSuffix);
}

function copyValue(source: unknown, ...names: string[]) {
  return pickField(source, ...names);
}

function setIfPresent(target: Record<string, unknown>, key: string, value: unknown) {
  if (value == null || value === "") return;
  target[key] = value;
}

function postalCodeOf(value: unknown, depth = 0): string | null {
  if (value == null || depth > 6) return null;
  if (typeof value === "number" && Number.isFinite(value)) {
    const zip = String(Math.trunc(value));
    return zip.length >= 5 ? zip : null;
  }
  if (typeof value === "string") {
    const match = value.trim().match(/\b\d{5}(?:-\d{4})?\b/);
    if (match) return match[0];
    const trimmed = value.trim();
    return trimmed.length >= 5 && trimmed.length <= 10 ? trimmed : null;
  }
  if (typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  for (const key of Object.keys(record)) {
    if (/postal|zip/i.test(key)) {
      const found = postalCodeOf(record[key], depth + 1);
      if (found) return found;
    }
  }
  for (const key of Object.keys(record)) {
    if (/location|address|seller|contact|shipfrom|fromaddress/i.test(key)) {
      const found = postalCodeOf(record[key], depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function countryCodeOf(item: unknown) {
  const raw = asString(copyValue(item, "countryCode", "CountryCode", "country", "Country"));
  if (raw && raw.length === 2) return raw.toUpperCase();
  return "US";
}

function listingDurationOf(item: unknown, isFixedPrice: boolean) {
  const explicit = asEnumId(
    copyValue(item, "listingDuration", "ListingDuration", "duration", "Duration"),
  );
  const allowed = isFixedPrice
    ? [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 30, 60, 90]
    : [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  if (explicit && allowed.includes(explicit)) return explicit;
  const ending = endingAtOf(item);
  if (ending) {
    const days = Math.max(1, Math.ceil((ending.getTime() - Date.now()) / 86_400_000));
    return allowed.find((value) => value >= days) ?? allowed[allowed.length - 1];
  }
  return isFixedPrice ? 90 : 14;
}

function pictureUrlsOf(item: unknown, pictures: ListingPicture[]) {
  const fromItem = picturesFromItem(item).map((picture) => picture.url);
  const urls = uniquePictures(
    pictures,
    fromItem.map((url, index) => ({ url, pictureId: null, displayOrder: index + 1 })),
  )
    .map((picture) => picture.url)
    .filter((url) => url.startsWith("https://"));
  return urls;
}

function newItemIdFrom(payload: unknown) {
  const direct = asString(pickField(payload, "itemID", "ItemID", "itemId", "id", "ID"));
  if (direct && /^\d+$/.test(direct)) return direct;
  const message = asString(
    pickField(payload, "userMessage", "UserMessage", "message", "Message"),
  );
  const match = message?.match(/(\d{5,})/);
  return match?.[1] ?? null;
}

async function persistMapped(userId: string, mapped: MappedListing) {
  const now = new Date();
  const row = await prisma.listing.upsert({
    where: { userId_itemId: { userId, itemId: mapped.itemId } },
    create: {
      userId,
      itemId: mapped.itemId,
      title: mapped.title,
      subtitle: mapped.subtitle,
      description: mapped.description,
      thumbnailUrl: mapped.thumbnailUrl,
      picturesJson: JSON.stringify(mapped.pictures),
      quantity: mapped.quantity,
      price: mapped.price,
      startingBid: mapped.startingBid,
      buyNowPrice: mapped.buyNowPrice,
      fixedPrice: mapped.fixedPrice,
      isFixedPrice: mapped.isFixedPrice,
      endingAt: mapped.endingAt,
      sku: mapped.sku,
      upc: mapped.upc,
      reservePrice: mapped.reservePrice,
      collectorsElite: mapped.collectorsElite,
      paymentMethodsJson: JSON.stringify(mapped.paymentMethods),
      premiumFeaturesJson: JSON.stringify(mapped.premiumFeatures),
      whoPaysForShipping: mapped.whoPaysForShipping,
      shippingProfileId: mapped.shippingProfileId,
      shippingClassesJson: JSON.stringify(mapped.shippingClasses),
      shippingClassCostsJson: JSON.stringify(mapped.shippingClassCosts),
      condition: mapped.condition,
      isFflRequired: mapped.isFflRequired ?? false,
      weight: mapped.weight,
      weightUnit: mapped.weightUnit,
      inspectionPeriod: mapped.inspectionPeriod,
      ...detailsForCreate(mapped),
      lastImportedAt: now,
    },
    update: {
      title: mapped.title,
      subtitle: mapped.subtitle,
      description: mapped.description ?? undefined,
      thumbnailUrl: mapped.thumbnailUrl,
      picturesJson: mapped.pictures.length ? JSON.stringify(mapped.pictures) : undefined,
      quantity: mapped.quantity,
      price: mapped.price,
      startingBid: mapped.startingBid,
      buyNowPrice: mapped.buyNowPrice,
      fixedPrice: mapped.fixedPrice,
      isFixedPrice: mapped.isFixedPrice,
      endingAt: mapped.endingAt,
      sku: mapped.sku,
      upc: mapped.upc,
      reservePrice: mapped.reservePrice,
      collectorsElite: mapped.collectorsElite,
      paymentMethodsJson: hasAnyPaymentMethod(mapped.paymentMethods)
        ? JSON.stringify(mapped.paymentMethods)
        : undefined,
      premiumFeaturesJson: hasAnyPremiumFeature(mapped.premiumFeatures)
        ? JSON.stringify(mapped.premiumFeatures)
        : undefined,
      whoPaysForShipping: mapped.whoPaysForShipping ?? undefined,
      shippingProfileId: mapped.shippingProfileId ?? undefined,
      shippingClassesJson: hasAnyShippingClass(mapped.shippingClasses)
        ? JSON.stringify(mapped.shippingClasses)
        : undefined,
      shippingClassCostsJson: hasAnyShippingClass(mapped.shippingClasses)
        ? JSON.stringify(mapped.shippingClassCosts)
        : undefined,
      condition: mapped.condition ?? undefined,
      isFflRequired: mapped.isFflRequired ?? undefined,
      weight: mapped.weight ?? undefined,
      weightUnit: mapped.weightUnit ?? undefined,
      inspectionPeriod: mapped.inspectionPeriod ?? undefined,
      ...detailsForUpdate(mapped),
      lastImportedAt: now,
    },
  });
  return toDetail(row);
}

function applyShippingToBody(
  body: Record<string, unknown>,
  input: {
    whoPaysForShipping: number | null;
    shippingProfileId: number | null;
    shippingClasses: ShippingClasses;
    shippingClassCosts: ShippingClassCosts;
  },
) {
  const useProfile =
    input.shippingProfileId != null &&
    (input.whoPaysForShipping === 16 || !hasAnyShippingClass(input.shippingClasses));

  if (useProfile && input.shippingProfileId) {
    body.ShippingProfileID = input.shippingProfileId;
    body.WhoPaysForShipping = 16;
    return;
  }

  if (!hasAnyShippingClass(input.shippingClasses)) {
    throw new Error(
      "This listing has no shipping class. Open it, choose at least one shipping class, commit, then clone.",
    );
  }
  body.WhoPaysForShipping =
    input.whoPaysForShipping && input.whoPaysForShipping !== 16
      ? input.whoPaysForShipping
      : 4;
  body.ShippingClassesSupported = shippingClassesForApi(input.shippingClasses);
  body.ShippingClassCosts = shippingClassCostsForApi(
    input.shippingClasses,
    input.shippingClassCosts,
  );
}

function firstPaymentMethods(...values: unknown[]) {
  for (const value of values) {
    const parsed = parsePaymentMethods(value);
    if (hasAnyPaymentMethod(parsed)) return parsed;
  }
  return parsePaymentMethods(null);
}

function overlayCharacteristics(
  raw: unknown,
  overlay: {
    manufacturer: string | null;
    caliber: string | null;
    rounds: number | null;
  },
) {
  const setObject = (target: Record<string, unknown>) => {
    if (overlay.manufacturer) target.Manufacturer = overlay.manufacturer;
    if (overlay.caliber) target.Caliber = overlay.caliber;
    if (overlay.rounds != null) target.NumberOfRoundsPerQuantityOne = overlay.rounds;
    return target;
  };
  if (Array.isArray(raw)) {
    const next = raw.filter((entry) => entry && typeof entry === "object") as Record<
      string,
      unknown
    >[];
    const setAttr = (name: string, value: unknown) => {
      const wanted = name.toLowerCase();
      const index = next.findIndex((entry) => {
        const entryName = asString(
          pickField(entry, "name", "Name", "attributeName", "AttributeName", "key", "Key"),
        );
        return entryName?.toLowerCase() === wanted;
      });
      if (index >= 0) {
        next[index] = { ...next[index], Value: value, value };
        return;
      }
      next.push({ Name: name, Value: value });
    };
    if (overlay.manufacturer) setAttr("Manufacturer", overlay.manufacturer);
    if (overlay.caliber) setAttr("Caliber", overlay.caliber);
    if (overlay.rounds != null) setAttr("NumberOfRoundsPerQuantityOne", overlay.rounds);
    return next.length ? next : null;
  }
  const obj =
    raw && typeof raw === "object" ? { ...(raw as Record<string, unknown>) } : {};
  setObject(obj);
  return Object.keys(obj).length ? obj : null;
}

function clonePayload(
  item: unknown,
  pictures: ListingPicture[],
  extras: unknown[],
  title: string,
  stored: {
    paymentMethods: PaymentMethods;
    whoPaysForShipping: number | null;
    shippingProfileId: number | null;
    shippingClasses: ShippingClasses;
    shippingClassCosts: ShippingClassCosts;
    condition: number | null;
    isFflRequired: boolean;
    weight: number | null;
    weightUnit: number | null;
    inspectionPeriod: number | null;
    manufacturer: string | null;
    caliber: string | null;
    rounds: number | null;
    mfgPartNumber: string | null;
    serialNumber: string | null;
    gtin: string | null;
    excludeStates: string[];
    listingDuration: number | null;
    autoRelist: number | null;
    autoRelistFixedCount: number | null;
    premiumFeatures: PremiumFeatures;
  },
  overlay?: {
    description?: string | null;
    sku?: string | null;
    upc?: string | null;
    pictureUrls?: string[] | null;
  },
) {
  const isFixedPrice = isFixedPriceOf(item);
  const source =
    extras.length > 0
      ? Object.assign({}, ...extras.filter((entry) => entry && typeof entry === "object"), item)
      : item;
  const flags = itemFlagsFromItem(item);
  const sourceFlags = itemFlagsFromItem(source);
  const details = itemDetailsFromItem(item);
  const sourceDetails = itemDetailsFromItem(source);
  const manufacturer =
    details.manufacturer ?? sourceDetails.manufacturer ?? stored.manufacturer;
  const caliber = details.caliber ?? sourceDetails.caliber ?? stored.caliber;
  const rounds = details.rounds ?? sourceDetails.rounds ?? stored.rounds;
  const allowedDurations = isFixedPrice
    ? [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 30, 60, 90]
    : [1, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14];
  const requestedDuration = details.listingDuration ?? stored.listingDuration;
  const listingDuration =
    requestedDuration && allowedDurations.includes(requestedDuration)
      ? requestedDuration
      : listingDurationOf(item, isFixedPrice);
  const body: Record<string, unknown> = {
    Title: title,
    Description:
      overlay && "description" in overlay
        ? overlay.description?.trim() || title
        : (asString(copyValue(item, "descriptionOnly", "DescriptionOnly", "description", "Description")) ??
          title),
    CategoryID: asEnumId(copyValue(item, "categoryID", "CategoryID", "categoryId")),
    Condition: flags.condition ?? sourceFlags.condition ?? stored.condition ?? 1,
    CountryCode: countryCodeOf(source),
    Quantity: Math.max(1, Math.round(asNumber(copyValue(item, "quantity", "Quantity")) ?? 1)),
    ListingDuration: listingDuration,
  };

  if (body.CategoryID == null) {
    throw new Error("This listing is missing a category, so it cannot be cloned.");
  }
  if (!isFixedPrice && body.Quantity !== 1) {
    body.Quantity = 1;
  }

  const postalCode = postalCodeOf(item) ?? extras.reduce<string | null>(
    (found, extra) => found ?? postalCodeOf(extra),
    null,
  );
  if (!postalCode) {
    throw new Error("Could not find a postal code to clone this listing.");
  }
  body.PostalCode = postalCode;
  setIfPresent(body, "SKU", overlay?.sku ?? copyValue(item, "sku", "SKU"));
  setIfPresent(body, "UPC", overlay?.upc ?? copyValue(item, "upc", "UPC"));
  setIfPresent(
    body,
    "GTIN",
    details.gtin ?? sourceDetails.gtin ?? stored.gtin ?? copyValue(item, "gtin", "GTIN"),
  );
  setIfPresent(
    body,
    "MfgPartNumber",
    details.mfgPartNumber ??
      sourceDetails.mfgPartNumber ??
      stored.mfgPartNumber ??
      copyValue(item, "mfgPartNumber", "MfgPartNumber", "mpn", "MPN"),
  );
  setIfPresent(
    body,
    "SerialNumber",
    details.serialNumber ??
      sourceDetails.serialNumber ??
      stored.serialNumber ??
      copyValue(item, "serialNumber", "SerialNumber"),
  );
  setIfPresent(body, "Manufacturer", manufacturer);
  setIfPresent(body, "Caliber", caliber);
  const inspectionPeriod =
    flags.inspectionPeriod ??
    sourceFlags.inspectionPeriod ??
    stored.inspectionPeriod;
  setIfPresent(body, "InspectionPeriod", inspectionPeriod);
  body.IsFFLRequired =
    flags.isFflRequired ?? sourceFlags.isFflRequired ?? stored.isFflRequired;
  setIfPresent(body, "WillShipInternational", asBoolean(copyValue(source, "willShipInternational", "WillShipInternational")));
  const weight = flags.weight ?? sourceFlags.weight ?? stored.weight;
  if (weight != null) {
    body.Weight = weight;
    body.WeightUnit =
      flags.weightUnit ?? sourceFlags.weightUnit ?? stored.weightUnit ?? 1;
  }
  const paymentMethods = firstPaymentMethods(
    copyValue(item, "paymentMethods", "PaymentMethods"),
    copyValue(source, "paymentMethods", "PaymentMethods"),
    stored.paymentMethods,
  );
  if (!hasAnyPaymentMethod(paymentMethods)) {
    throw new Error(
      "This listing has no payment methods. Open it, choose at least one payment option, commit, then clone.",
    );
  }
  body.PaymentMethods = paymentMethodsForApi(paymentMethods);
  setIfPresent(body, "PaymentPlan", asEnumId(copyValue(source, "paymentPlan", "PaymentPlan")));
  const characteristics = overlayCharacteristics(
    copyValue(item, "characteristics", "Characteristics") ??
      copyValue(source, "characteristics", "Characteristics"),
    { manufacturer, caliber, rounds },
  );
  setIfPresent(body, "Characteristics", characteristics);
  const autoRelist =
    details.autoRelist ?? sourceDetails.autoRelist ?? stored.autoRelist;
  setIfPresent(body, "AutoRelist", autoRelist);
  if (autoRelist === 3) {
    setIfPresent(
      body,
      "AutoRelistFixedCount",
      details.autoRelistFixedCount ??
        sourceDetails.autoRelistFixedCount ??
        stored.autoRelistFixedCount,
    );
  }
  const excludeStates = details.excludeStates.length
    ? details.excludeStates
    : sourceDetails.excludeStates.length
      ? sourceDetails.excludeStates
      : stored.excludeStates;
  if (excludeStates.length) {
    body.UseDefaultExcludeStates = false;
    body.ExcludeStates = excludeStatesText(excludeStates);
  } else {
    body.UseDefaultExcludeStates = true;
  }
  setIfPresent(body, "Prop65Warning", copyValue(item, "prop65Warning", "Prop65Warning"));
  setIfPresent(body, "StandardTextID", asEnumId(copyValue(item, "standardTextID", "StandardTextID")));
  setIfPresent(body, "CanOffer", asBoolean(copyValue(item, "canOffer", "CanOffer")));
  setIfPresent(body, "AutoAcceptPrice", asMoney(copyValue(item, "autoAcceptPrice", "AutoAcceptPrice")));
  setIfPresent(body, "AutoRejectPrice", asMoney(copyValue(item, "autoRejectPrice", "AutoRejectPrice")));

  if (isFixedPrice) {
    setIfPresent(body, "FixedPrice", asMoney(copyValue(item, "fixedPrice", "FixedPrice")) ?? priceOf(item, true));
  } else {
    setIfPresent(
      body,
      "StartingBid",
      asMoney(copyValue(item, "startingBid", "StartingBid")) ?? priceOf(item, false),
    );
    setIfPresent(body, "BuyNowPrice", asMoney(copyValue(item, "buyNowPrice", "BuyNowPrice")));
  }

  const itemShipping = shippingFromItem(item);
  const sourceShipping = shippingFromItem(source);
  applyShippingToBody(body, {
    whoPaysForShipping:
      itemShipping.whoPaysForShipping ??
      sourceShipping.whoPaysForShipping ??
      stored.whoPaysForShipping,
    shippingProfileId:
      itemShipping.shippingProfileId ??
      sourceShipping.shippingProfileId ??
      stored.shippingProfileId,
    shippingClasses: hasAnyShippingClass(itemShipping.shippingClasses)
      ? itemShipping.shippingClasses
      : hasAnyShippingClass(sourceShipping.shippingClasses)
        ? sourceShipping.shippingClasses
        : stored.shippingClasses,
    shippingClassCosts: hasAnyShippingClass(itemShipping.shippingClasses)
      ? itemShipping.shippingClassCosts
      : hasAnyShippingClass(sourceShipping.shippingClasses)
        ? sourceShipping.shippingClassCosts
        : stored.shippingClassCosts,
  });

  const overlayUrls = (overlay?.pictureUrls ?? [])
    .filter((url) => url.startsWith("https://"));
  const urls = overlayUrls.length ? overlayUrls : pictureUrlsOf(item, pictures);
  if (urls.length) body.PictureURLs = urls;

  const premiumFeatures = hasAnyPremiumFeature(stored.premiumFeatures)
    ? stored.premiumFeatures
    : parsePremiumFeatures(item);
  if (hasAnyPremiumFeature(premiumFeatures)) {
    const clonePremium = {
      ...premiumFeatures,
      isScheduled: false,
      scheduledStartingAt: null,
    };
    if (hasAnyPremiumFeature(clonePremium)) {
      body.PremiumFeatures = premiumFeaturesForApi(clonePremium);
    }
  }

  return body;
}

export async function deleteGunBrokerListing(userId: string, itemId: string) {
  const existing = await prisma.listing.findUnique({
    where: { userId_itemId: { userId, itemId } },
  });
  if (!existing) {
    throw new Error("That listing is not in your inventory.");
  }

  await withGunBrokerAccess(userId, async (accessToken) => {
    try {
      await endItem(accessToken, itemId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/not found|ended|already/i.test(message)) throw error;
    }
  });

  await prisma.listing.delete({
    where: { userId_itemId: { userId, itemId } },
  });
}

export async function cloneGunBrokerListing(
  userId: string,
  itemId: string,
  options?: {
    preferredTitle?: string | null;
    preferredDescription?: string | null;
    preferredSku?: string | null;
    preferredUpc?: string | null;
    preferredPictureUrls?: string[] | null;
  },
) {
  const existing = await prisma.listing.findUnique({
    where: { userId_itemId: { userId, itemId } },
  });
  if (!existing) {
    throw new Error("That listing is not in your inventory. Import from GunBroker first.");
  }

  const title = cloneTitle(existing.title, options?.preferredTitle);
  const overlay =
    options && "preferredDescription" in options
      ? {
          description: options.preferredDescription,
          sku: options.preferredSku,
          upc: options.preferredUpc,
          pictureUrls: options.preferredPictureUrls,
        }
      : undefined;
  const created = await withGunBrokerAccess(userId, async (accessToken) => {
    const [item, pictureRows, defaults, account, contact] = await Promise.all([
      getItem(accessToken, itemId),
      getItemPictures(accessToken, itemId).catch(() => []),
      getListingDefaults(accessToken).catch(() => null),
      getAccountPayload(accessToken).catch(() => null),
      getContactInfo(accessToken).catch(() => null),
    ]);
    const pictures = uniquePictures(
      picturesFromRows(pictureRows),
      picturesFromItem(item),
      existing.thumbnailUrl
        ? [{ url: existing.thumbnailUrl, pictureId: null, displayOrder: 1 }]
        : [],
    );
    const payload = await createItem(
      accessToken,
      clonePayload(
        item,
        pictures,
        [defaults, account, contact],
        title,
        {
          paymentMethods: parsePaymentMethods(existing.paymentMethodsJson),
          whoPaysForShipping: existing.whoPaysForShipping,
          shippingProfileId: existing.shippingProfileId,
          shippingClasses: parseShippingClasses(existing.shippingClassesJson),
          shippingClassCosts: parseShippingClassCosts(existing.shippingClassCostsJson),
          condition: existing.condition,
          isFflRequired: existing.isFflRequired,
          weight: existing.weight,
          weightUnit: existing.weightUnit,
          inspectionPeriod: existing.inspectionPeriod,
          manufacturer: existing.manufacturer,
          caliber: existing.caliber,
          rounds: existing.rounds,
          mfgPartNumber: existing.mfgPartNumber,
          serialNumber: existing.serialNumber,
          gtin: existing.gtin,
          excludeStates: parseExcludeStates(existing.excludeStates),
          listingDuration: existing.listingDuration,
          autoRelist: existing.autoRelist,
          autoRelistFixedCount: existing.autoRelistFixedCount,
          premiumFeatures: parsePremiumFeatures(existing.premiumFeaturesJson),
        },
        overlay,
      ),
    );
    const newItemId = newItemIdFrom(payload);
    if (!newItemId) {
      throw new Error("GunBroker listed the clone but did not return a new item number.");
    }
    const createdItem = await getItem(accessToken, newItemId).catch(() => null);
    return { newItemId, createdItem, pictures };
  });

  const mapped = created.createdItem ? mapSummary(created.createdItem) : null;
  const description =
    overlay && "description" in overlay
      ? overlay.description?.trim() || title
      : existing.description;
  const sku = overlay?.sku ?? existing.sku;
  const upc = overlay?.upc ?? existing.upc;
  const thumbnailUrl = overlay?.pictureUrls?.[0] ?? existing.thumbnailUrl;
  if (mapped) {
    await persistMapped(userId, {
      ...mapped,
      title,
      description: description ?? mapped.description,
      sku: sku ?? mapped.sku,
      upc: upc ?? mapped.upc,
      thumbnailUrl: thumbnailUrl ?? mapped.thumbnailUrl,
    });
    return mapped.itemId;
  }

  if (!created.newItemId) {
    throw new Error("GunBroker listed the clone but did not return a new item number.");
  }

  await persistMapped(userId, {
    itemId: created.newItemId,
    title,
    subtitle: null,
    description: description ?? null,
    thumbnailUrl: thumbnailUrl ?? null,
    pictures: overlay?.pictureUrls?.length
      ? overlay.pictureUrls.map((url, index) => ({
          url,
          pictureId: null,
          displayOrder: index + 1,
        }))
      : created.pictures,
    quantity: existing.quantity,
    startingBid: existing.startingBid,
    buyNowPrice: existing.buyNowPrice,
    fixedPrice: existing.fixedPrice,
    isFixedPrice: existing.isFixedPrice,
    price: existing.price,
    endingAt: existing.endingAt,
    sku,
    upc,
    reservePrice: null,
    collectorsElite: false,
    paymentMethods: parsePaymentMethods(existing.paymentMethodsJson),
    whoPaysForShipping: existing.whoPaysForShipping,
    shippingProfileId: existing.shippingProfileId,
    shippingClasses: parseShippingClasses(existing.shippingClassesJson),
    shippingClassCosts: parseShippingClassCosts(existing.shippingClassCostsJson),
    condition: existing.condition,
    isFflRequired: existing.isFflRequired,
    weight: existing.weight,
    weightUnit: existing.weightUnit,
    inspectionPeriod: existing.inspectionPeriod,
    manufacturer: existing.manufacturer,
    caliber: existing.caliber,
    rounds: existing.rounds,
    mfgPartNumber: existing.mfgPartNumber,
    serialNumber: existing.serialNumber,
    gtin: existing.gtin,
    excludeStates: parseExcludeStates(existing.excludeStates),
    listingDuration: existing.listingDuration,
    autoRelist: existing.autoRelist,
    autoRelistFixedCount: existing.autoRelistFixedCount,
    premiumFeatures: parsePremiumFeatures(existing.premiumFeaturesJson),
  });
  return created.newItemId;
}
