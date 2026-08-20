import { decryptSecret, encryptSecret } from "@/lib/crypto";
import {
  cloneGunBrokerListing,
  commitListingQuick,
  deleteGunBrokerListing,
  patchListingCatalogFields,
} from "@/lib/gunbroker/listings";
import { prisma, WOO_PRODUCT_HAS_ATTRIBUTES_JSON } from "@/lib/prisma";
import { WOOCOMMERCE_PROVIDER, normalizeStoreUrl } from "@/lib/woocommerce/config";
import { listWooProducts, getWooProduct, pingWooCommerce } from "@/lib/woocommerce/client";
import { classifyWooProduct } from "@/lib/woocommerce/classify";
import {
  attributesFromJson,
  attributesToJson,
  resolveGunBrokerFields,
} from "@/lib/woocommerce/attributes";
import { reportImportProgress, reportSaveProgress, type ImportProgressHandler } from "@/lib/import-progress";
import {
  WooCommerceApiError,
  type LinkedListingSummary,
  type QuantitySource,
  type WooCommerceSecrets,
  type WooCommerceStatus,
  type WooProductCard,
  type WooProductDetail,
} from "@/lib/woocommerce/types";

function wooAttributesJson(attributes: { name: string; slug: string | null; value: string }[]) {
  if (!WOO_PRODUCT_HAS_ATTRIBUTES_JSON) return {};
  return { attributesJson: attributesToJson(attributes) };
}

function readRowAttributesJson(row: { attributesJson?: string | null }) {
  return row.attributesJson ?? "[]";
}

function wooProductPersistFields(product: {
  parentId: number;
  name: string;
  slug: string | null;
  permalink: string | null;
  sku: string | null;
  upc: string | null;
  type: string;
  status: string;
  stockStatus: string;
  price: number | null;
  regularPrice: number | null;
  stockQuantity: number | null;
  thumbnailUrl: string | null;
  description: string | null;
  manufacturer: string | null;
  caliber: string | null;
  rounds: number | null;
  gtin: string | null;
  mfgPartNumber: string | null;
  serialNumber: string | null;
  attributes: { name: string; slug: string | null; value: string }[];
  categories: string[];
}) {
  const resolved = resolveGunBrokerFields({
    description: product.description,
    attributesJson: attributesToJson(product.attributes),
    manufacturer: product.manufacturer,
    caliber: product.caliber,
    rounds: product.rounds,
    upc: product.upc,
    gtin: product.gtin,
    mfgPartNumber: product.mfgPartNumber,
    serialNumber: product.serialNumber,
  });
  return {
    parentId: product.parentId,
    name: product.name,
    slug: product.slug,
    permalink: product.permalink,
    sku: product.sku,
    upc: resolved.upc ?? product.upc,
    type: product.type,
    status: product.status,
    stockStatus: product.stockStatus,
    price: product.price,
    regularPrice: product.regularPrice,
    stockQuantity: product.stockQuantity,
    thumbnailUrl: product.thumbnailUrl,
    description: product.description,
    manufacturer: resolved.manufacturer ?? product.manufacturer,
    caliber: resolved.caliber ?? product.caliber,
    rounds: resolved.rounds ?? product.rounds,
    gtin: resolved.gtin ?? product.gtin,
    mfgPartNumber: resolved.mfgPartNumber ?? product.mfgPartNumber,
    serialNumber: resolved.serialNumber ?? product.serialNumber,
    ...wooAttributesJson(product.attributes),
    categoriesJson: JSON.stringify(product.categories),
  };
}

function isUnknownAttributesJsonError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  return /Unknown argument [`']attributesJson[`']/.test(message);
}

async function wooProductUpsert(
  args: Parameters<typeof prisma.wooProduct.upsert>[0],
) {
  try {
    await prisma.wooProduct.upsert(args);
  } catch (error) {
    if (!isUnknownAttributesJsonError(error)) throw error;
    const { create, update, ...rest } = args;
    const strip = <T extends object>(data: T): T => {
      const next = { ...data } as Record<string, unknown>;
      delete next.attributesJson;
      return next as T;
    };
    await prisma.wooProduct.upsert({
      ...rest,
      create: strip(create),
      update: strip(update),
    });
  }
}

function readSecrets(cipher: string | null): WooCommerceSecrets | null {
  if (!cipher) return null;
  return JSON.parse(decryptSecret(cipher)) as WooCommerceSecrets;
}

function explainWooError(error: unknown) {
  if (error instanceof WooCommerceApiError) return error.userMessage;
  if (error instanceof Error) return error.message;
  return "Could not connect to WooCommerce.";
}

async function credentialsFor(userId: string) {
  const row = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: WOOCOMMERCE_PROVIDER } },
  });
  const secrets = readSecrets(row?.secretsCipher ?? null);
  if (!row || !secrets?.storeUrl || !secrets.consumerKey || !secrets.consumerSecret) {
    throw new Error("Connect WooCommerce in Settings before importing products.");
  }
  return { row, secrets };
}

export async function getWooCommerceStatus(userId: string): Promise<WooCommerceStatus> {
  const row = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: WOOCOMMERCE_PROVIDER } },
  });
  const secrets = readSecrets(row?.secretsCipher ?? null);
  const productCount = await prisma.wooProduct.count({ where: { userId } });
  return {
    status: (row?.status as WooCommerceStatus["status"]) ?? "disconnected",
    storeUrl: secrets?.storeUrl ?? row?.username ?? null,
    hasCredentials: Boolean(secrets?.consumerKey && secrets?.consumerSecret),
    lastVerifiedAt: row?.lastVerifiedAt?.toISOString() ?? null,
    lastError: row?.lastError ?? null,
    productCount,
  };
}

export async function isWooCommerceConnected(userId: string) {
  const row = await prisma.integration.findUnique({
    where: { userId_provider: { userId, provider: WOOCOMMERCE_PROVIDER } },
    select: { status: true, secretsCipher: true },
  });
  return row?.status === "connected" && Boolean(row.secretsCipher);
}

export async function connectWooCommerceStore(
  userId: string,
  input: {
    storeUrl: string;
    consumerKey: string;
    consumerSecret: string;
  },
) {
  const storeUrl = normalizeStoreUrl(input.storeUrl);
  const consumerKey = input.consumerKey.trim();
  const consumerSecret = input.consumerSecret.trim();
  if (!consumerKey || !consumerSecret) {
    throw new Error("Consumer key and secret are required.");
  }

  const secrets: WooCommerceSecrets = { storeUrl, consumerKey, consumerSecret };

  try {
    const ping = await pingWooCommerce(secrets);
    secrets.storeUrl = ping.storeUrl;
    await prisma.integration.upsert({
      where: { userId_provider: { userId, provider: WOOCOMMERCE_PROVIDER } },
      create: {
        userId,
        provider: WOOCOMMERCE_PROVIDER,
        status: "connected",
        username: ping.storeUrl,
        secretsCipher: encryptSecret(JSON.stringify(secrets)),
        externalUsername: ping.storeUrl,
        lastError: null,
        lastVerifiedAt: new Date(),
      },
      update: {
        status: "connected",
        username: ping.storeUrl,
        secretsCipher: encryptSecret(JSON.stringify(secrets)),
        externalUsername: ping.storeUrl,
        lastError: null,
        lastVerifiedAt: new Date(),
      },
    });
  } catch (error) {
    const message = explainWooError(error);
    await prisma.integration.upsert({
      where: { userId_provider: { userId, provider: WOOCOMMERCE_PROVIDER } },
      create: {
        userId,
        provider: WOOCOMMERCE_PROVIDER,
        status: "error",
        username: storeUrl,
        secretsCipher: encryptSecret(JSON.stringify(secrets)),
        lastError: message,
        lastVerifiedAt: null,
      },
      update: {
        status: "error",
        username: storeUrl,
        secretsCipher: encryptSecret(JSON.stringify(secrets)),
        lastError: message,
        lastVerifiedAt: null,
      },
    });
    throw new Error(message);
  }
}

export async function testWooCommerceStore(userId: string) {
  const { secrets } = await credentialsFor(userId);
  try {
    const ping = await pingWooCommerce(secrets);
    await prisma.integration.update({
      where: { userId_provider: { userId, provider: WOOCOMMERCE_PROVIDER } },
      data: {
        status: "connected",
        username: ping.storeUrl,
        externalUsername: ping.storeUrl,
        lastError: null,
        lastVerifiedAt: new Date(),
        secretsCipher: encryptSecret(
          JSON.stringify({ ...secrets, storeUrl: ping.storeUrl }),
        ),
      },
    });
  } catch (error) {
    const message = explainWooError(error);
    await prisma.integration.update({
      where: { userId_provider: { userId, provider: WOOCOMMERCE_PROVIDER } },
      data: { status: "error", lastError: message },
    });
    throw new Error(message);
  }
}

export async function disconnectWooCommerceStore(userId: string) {
  await prisma.integration.updateMany({
    where: { userId, provider: WOOCOMMERCE_PROVIDER },
    data: {
      status: "disconnected",
      secretsCipher: null,
      externalUsername: null,
      lastVerifiedAt: null,
      lastError: null,
    },
  });
}

export async function importWooCommerceProducts(
  userId: string,
  onProgress?: ImportProgressHandler,
) {
  const { secrets } = await credentialsFor(userId);
  const { storeUrl, products } = await listWooProducts(secrets, onProgress);
  const now = new Date();
  const productIds = products.map((product) => product.productId);
  await reportImportProgress(onProgress, {
    loaded: products.length,
    total: products.length,
    phase: "saving",
  });

  for (const [index, product] of products.entries()) {
    await wooProductUpsert({
      where: { userId_productId: { userId, productId: product.productId } },
      create: {
        userId,
        productId: product.productId,
        ...wooProductPersistFields(product),
        listedOnStore: true,
        lastImportedAt: now,
      },
      update: {
        ...wooProductPersistFields(product),
        listedOnStore: true,
        lastImportedAt: now,
      },
    });
    await reportSaveProgress(onProgress, index, products.length);
  }

  await prisma.wooProduct.updateMany({
    where: { userId, productId: { notIn: productIds.length ? productIds : [-1] } },
    data: { listedOnStore: false },
  });
  await prisma.wooProduct.deleteMany({
    where: {
      userId,
      listedOnStore: false,
      sourceForGunBroker: false,
      linkedItemId: null,
    },
  });

  await prisma.integration.update({
    where: { userId_provider: { userId, provider: WOOCOMMERCE_PROVIDER } },
    data: {
      status: "connected",
      username: storeUrl,
      externalUsername: storeUrl,
      lastError: null,
      lastVerifiedAt: now,
      secretsCipher: encryptSecret(JSON.stringify({ ...secrets, storeUrl })),
    },
  });

  const linked = await prisma.wooProduct.findMany({
    where: { userId, linkedItemId: { not: null } },
    select: {
      linkedItemId: true,
      description: true,
      manufacturer: true,
      caliber: true,
      rounds: true,
      upc: true,
      gtin: true,
      mfgPartNumber: true,
      serialNumber: true,
      attributesJson: true,
    },
  });
  for (const row of linked) {
    if (!row.linkedItemId) continue;
    const fields = resolveGunBrokerFields({
      description: row.description,
      attributesJson: readRowAttributesJson(row),
      manufacturer: row.manufacturer,
      caliber: row.caliber,
      rounds: row.rounds,
      upc: row.upc,
      gtin: row.gtin,
      mfgPartNumber: row.mfgPartNumber,
      serialNumber: row.serialNumber,
    });
    if (!fields.manufacturer && !fields.caliber && fields.rounds == null) continue;
    try {
      await patchListingCatalogFields(userId, row.linkedItemId, fields);
    } catch {
      // Import succeeded; GunBroker catalog sync can fail independently.
    }
  }

  return { count: products.length, storeUrl };
}

function categoriesFrom(json: string) {
  try {
    const parsed = JSON.parse(json) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item) => String(item)).filter(Boolean);
  } catch {
    return [];
  }
}

function parseQuantitySource(value: string | null | undefined): QuantitySource {
  if (value === "gunbroker" || value === "manual" || value === "woocommerce") return value;
  return "woocommerce";
}

function listingSummary(row: {
  itemId: string;
  title: string;
  quantity: number;
  price: number | null;
  thumbnailUrl: string | null;
  endingAt: Date | null;
}): LinkedListingSummary {
  return {
    itemId: row.itemId,
    title: row.title,
    quantity: row.quantity,
    price: row.price,
    thumbnailUrl: row.thumbnailUrl,
    endingAt: row.endingAt?.toISOString() ?? null,
  };
}

function toWooCard(
  row: {
    productId: number;
    parentId: number;
    name: string;
    permalink: string | null;
    sku: string | null;
    upc: string | null;
    type: string;
    status: string;
    stockStatus: string;
    price: number | null;
    stockQuantity: number | null;
    thumbnailUrl: string | null;
    categoriesJson: string;
    sourceForGunBroker: boolean;
    linkedItemId: string | null;
    quantitySource: string;
    manualQuantity: number | null;
    listedOnStore: boolean;
    lastImportedAt: Date;
  },
  listing: LinkedListingSummary | null,
): WooProductCard {
  const categories = categoriesFrom(row.categoriesJson);
  return {
    productId: row.productId,
    parentId: row.parentId,
    name: row.name,
    permalink: row.permalink,
    sku: row.sku,
    upc: row.upc,
    type: row.type,
    status: row.status,
    stockStatus: row.stockStatus,
    price: row.price,
    stockQuantity: row.stockQuantity,
    thumbnailUrl: row.thumbnailUrl,
    categories,
    kind: classifyWooProduct(row.name, categories),
    sourceForGunBroker: row.sourceForGunBroker,
    linkedItemId: row.linkedItemId,
    linkedListing: listing,
    quantitySource: parseQuantitySource(row.quantitySource),
    manualQuantity: row.manualQuantity,
    listedOnStore: row.listedOnStore,
    lastImportedAt: row.lastImportedAt.toISOString(),
  };
}

async function listingsByItemId(userId: string) {
  const rows = await prisma.listing.findMany({
    where: { userId },
    select: {
      itemId: true,
      title: true,
      quantity: true,
      price: true,
      thumbnailUrl: true,
      endingAt: true,
      sku: true,
      upc: true,
      gtin: true,
    },
  });
  return new Map(rows.map((row) => [row.itemId, row]));
}

export async function listLocalWooProducts(userId: string): Promise<WooProductCard[]> {
  const [rows, listings] = await Promise.all([
    prisma.wooProduct.findMany({
      where: { userId },
      orderBy: [{ name: "asc" }],
    }),
    listingsByItemId(userId),
  ]);
  return rows
    .filter((row) => row.type !== "variable")
    .map((row) => {
      const listing = row.linkedItemId ? listings.get(row.linkedItemId) : null;
      return toWooCard(row, listing ? listingSummary(listing) : null);
    });
}

function toWooDetail(
  row: {
    productId: number;
    parentId: number;
    name: string;
    slug: string | null;
    permalink: string | null;
    sku: string | null;
    upc: string | null;
    type: string;
    status: string;
    stockStatus: string;
    price: number | null;
    regularPrice: number | null;
    stockQuantity: number | null;
    thumbnailUrl: string | null;
    description: string | null;
    manufacturer: string | null;
    caliber: string | null;
    rounds: number | null;
    gtin: string | null;
    mfgPartNumber: string | null;
    serialNumber: string | null;
    attributesJson?: string | null;
    categoriesJson: string;
    sourceForGunBroker: boolean;
    linkedItemId: string | null;
    quantitySource: string;
    manualQuantity: number | null;
    listedOnStore: boolean;
    lastImportedAt: Date;
  },
  listing: LinkedListingSummary | null,
): WooProductDetail {
  const categories = categoriesFrom(row.categoriesJson);
  const attributes = attributesFromJson(readRowAttributesJson(row));
  const gunBrokerFields = resolveGunBrokerFields({
    description: row.description,
    attributesJson: readRowAttributesJson(row),
    manufacturer: row.manufacturer,
    caliber: row.caliber,
    rounds: row.rounds,
    upc: row.upc,
    gtin: row.gtin,
    mfgPartNumber: row.mfgPartNumber,
    serialNumber: row.serialNumber,
  });
  return {
    productId: row.productId,
    parentId: row.parentId,
    name: row.name,
    slug: row.slug,
    permalink: row.permalink,
    sku: row.sku,
    upc: row.upc,
    type: row.type,
    status: row.status,
    stockStatus: row.stockStatus,
    price: row.price,
    regularPrice: row.regularPrice,
    stockQuantity: row.stockQuantity,
    thumbnailUrl: row.thumbnailUrl,
    description: row.description,
    manufacturer: row.manufacturer,
    caliber: row.caliber,
    rounds: row.rounds,
    gtin: row.gtin,
    mfgPartNumber: row.mfgPartNumber,
    serialNumber: row.serialNumber,
    attributes,
    gunBrokerFields,
    categories,
    kind: classifyWooProduct(row.name, categories),
    sourceForGunBroker: row.sourceForGunBroker,
    linkedItemId: row.linkedItemId,
    linkedListing: listing,
    quantitySource: parseQuantitySource(row.quantitySource),
    manualQuantity: row.manualQuantity,
    listedOnStore: row.listedOnStore,
    lastImportedAt: row.lastImportedAt.toISOString(),
  };
}

export async function getWooProductDetail(userId: string, productId: number) {
  const row = await prisma.wooProduct.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!row) return null;
  const listing = row.linkedItemId
    ? await prisma.listing.findUnique({
        where: { userId_itemId: { userId, itemId: row.linkedItemId } },
        select: {
          itemId: true,
          title: true,
          quantity: true,
          price: true,
          thumbnailUrl: true,
          endingAt: true,
        },
      })
    : null;
  return toWooDetail(row, listing ? listingSummary(listing) : null);
}

export async function setWooGunBrokerSource(
  userId: string,
  productId: number,
  sourceForGunBroker: boolean,
) {
  const row = await prisma.wooProduct.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!row) throw new Error("That store product is not in Chamber.");

  await prisma.wooProduct.update({
    where: { userId_productId: { userId, productId } },
    data: { sourceForGunBroker },
  });
}

export async function linkWooProductToGunBroker(userId: string, productId: number) {
  const row = await prisma.wooProduct.findUnique({
    where: { userId_productId: { userId, productId } },
  });
  if (!row) throw new Error("That store product is not in Chamber.");

  const template = await prisma.listing.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { itemId: true },
  });
  if (!template && !row.linkedItemId) {
    throw new Error(
      "Import at least one GunBroker listing first. We use it as the posting template for linked WooCommerce items.",
    );
  }

  let live = null as Awaited<ReturnType<typeof getWooProduct>>;
  try {
    const { secrets } = await credentialsFor(userId);
    live = await getWooProduct(secrets, row.productId, row.parentId);
  } catch {
    live = null;
  }

  const description = live?.description ?? row.description;
  const sku = live?.sku ?? row.sku;
  const attributesJson = live
    ? attributesToJson(live.attributes)
    : readRowAttributesJson(row);
  const resolved = resolveGunBrokerFields({
    description,
    attributesJson,
    manufacturer: live?.manufacturer ?? row.manufacturer,
    caliber: live?.caliber ?? row.caliber,
    rounds: live?.rounds ?? row.rounds,
    upc: live?.upc ?? row.upc,
    gtin: live?.gtin ?? row.gtin,
    mfgPartNumber: live?.mfgPartNumber ?? row.mfgPartNumber,
    serialNumber: live?.serialNumber ?? row.serialNumber,
  });
  const upc = resolved.upc;
  const manufacturer = resolved.manufacturer;
  const caliber = resolved.caliber;
  const rounds = resolved.rounds;
  const gtin = resolved.gtin;
  const mfgPartNumber = resolved.mfgPartNumber;
  const serialNumber = resolved.serialNumber;
  const thumbnailUrl = live?.thumbnailUrl ?? row.thumbnailUrl;

  if (row.linkedItemId) {
    await prisma.wooProduct.update({
      where: { userId_productId: { userId, productId } },
      data: {
        sourceForGunBroker: true,
        description: description ?? undefined,
        manufacturer: manufacturer ?? undefined,
        caliber: caliber ?? undefined,
        rounds: rounds ?? undefined,
        gtin: gtin ?? undefined,
        mfgPartNumber: mfgPartNumber ?? undefined,
        serialNumber: serialNumber ?? undefined,
        upc: upc ?? undefined,
        sku: sku ?? undefined,
        thumbnailUrl: thumbnailUrl ?? undefined,
        ...(WOO_PRODUCT_HAS_ATTRIBUTES_JSON ? { attributesJson } : {}),
      },
    });
    try {
      await patchListingCatalogFields(userId, row.linkedItemId, resolved);
    } catch {
      // Keep the link even if GunBroker rejects a catalog field.
    }
    return { itemId: row.linkedItemId, alreadyLinked: true as const };
  }

  if (!template) {
    throw new Error(
      "Import at least one GunBroker listing first. We use it as the posting template for linked WooCommerce items.",
    );
  }

  const itemId = await cloneGunBrokerListing(userId, template.itemId, {
    preferredTitle: row.name,
    preferredDescription: description,
    preferredSku: sku,
    preferredUpc: upc,
    preferredGtin: gtin,
    preferredManufacturer: manufacturer,
    preferredCaliber: caliber,
    preferredRounds: rounds,
    preferredMfgPartNumber: mfgPartNumber,
    preferredSerialNumber: serialNumber,
    preferredPictureUrls: thumbnailUrl ? [thumbnailUrl] : null,
  });
  await commitListingQuick(userId, itemId, {
    quantity: Math.max(1, Math.round(row.stockQuantity ?? 1)),
    price: row.price ?? null,
  });
  try {
    await patchListingCatalogFields(userId, itemId, resolved);
  } catch {
    // Listing was created; catalog fields can be corrected on the next import.
  }

  await prisma.wooProduct.update({
    where: { userId_productId: { userId, productId } },
    data: {
      sourceForGunBroker: true,
      linkedItemId: itemId,
      description: description ?? undefined,
      manufacturer: manufacturer ?? undefined,
      caliber: caliber ?? undefined,
      rounds: rounds ?? undefined,
      gtin: gtin ?? undefined,
      mfgPartNumber: mfgPartNumber ?? undefined,
      serialNumber: serialNumber ?? undefined,
      upc: upc ?? undefined,
      sku: sku ?? undefined,
      thumbnailUrl: thumbnailUrl ?? undefined,
      ...(WOO_PRODUCT_HAS_ATTRIBUTES_JSON ? { attributesJson } : {}),
    },
  });

  return { itemId, alreadyLinked: false as const };
}

export async function linkWooProductToListing(
  userId: string,
  productId: number,
  itemId: string,
) {
  const listing = await prisma.listing.findUnique({
    where: { userId_itemId: { userId, itemId } },
    select: { itemId: true },
  });
  if (!listing) throw new Error("That GunBroker listing is not in your inventory.");

  await prisma.$transaction([
    prisma.wooProduct.updateMany({
      where: { userId, linkedItemId: itemId, productId: { not: productId } },
      data: { linkedItemId: null },
    }),
    prisma.wooProduct.update({
      where: { userId_productId: { userId, productId } },
      data: { linkedItemId: itemId, sourceForGunBroker: true },
    }),
  ]);
}

export async function unlinkWooProduct(userId: string, productId: number) {
  await prisma.wooProduct.update({
    where: { userId_productId: { userId, productId } },
    data: { linkedItemId: null },
  });
}

export type BreakWooLinkChoice = "delete-gunbroker" | "make-independent";

export async function breakWooGunBrokerLink(
  userId: string,
  productId: number,
  choice: BreakWooLinkChoice,
) {
  const row = await prisma.wooProduct.findUnique({
    where: { userId_productId: { userId, productId } },
    select: { linkedItemId: true },
  });
  if (!row) throw new Error("That store product is not in Chamber.");

  if (choice === "delete-gunbroker" && row.linkedItemId) {
    try {
      await deleteGunBrokerListing(userId, row.linkedItemId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (!/not found|ended|already|not in your inventory/i.test(message)) {
        throw error;
      }
    }
  }

  await prisma.wooProduct.update({
    where: { userId_productId: { userId, productId } },
    data: {
      sourceForGunBroker: false,
      linkedItemId: null,
    },
  });
}

export async function setWooQuantitySource(
  userId: string,
  productId: number,
  quantitySource: QuantitySource,
  manualQuantity?: number | null,
) {
  const data: {
    quantitySource: QuantitySource;
    manualQuantity?: number | null;
  } = { quantitySource };
  if (quantitySource === "manual") {
    if (manualQuantity == null || !Number.isFinite(manualQuantity)) {
      throw new Error("Enter a quantity to use the manual count.");
    }
    data.manualQuantity = Math.max(0, Math.round(manualQuantity));
  }
  await prisma.wooProduct.update({
    where: { userId_productId: { userId, productId } },
    data,
  });
}
