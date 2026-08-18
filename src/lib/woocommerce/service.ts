import { decryptSecret, encryptSecret } from "@/lib/crypto";
import {
  cloneGunBrokerListing,
  commitListingQuick,
  deleteGunBrokerListing,
} from "@/lib/gunbroker/listings";
import { prisma } from "@/lib/prisma";
import { WOOCOMMERCE_PROVIDER, normalizeStoreUrl } from "@/lib/woocommerce/config";
import { listWooProducts, getWooProduct, pingWooCommerce } from "@/lib/woocommerce/client";
import { classifyWooProduct } from "@/lib/woocommerce/classify";
import {
  WooCommerceApiError,
  type LinkedListingSummary,
  type QuantitySource,
  type WooCommerceSecrets,
  type WooCommerceStatus,
  type WooProductCard,
} from "@/lib/woocommerce/types";

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

export async function importWooCommerceProducts(userId: string) {
  const { secrets } = await credentialsFor(userId);
  const { storeUrl, products } = await listWooProducts(secrets);
  const now = new Date();
  const productIds = products.map((product) => product.productId);

  await prisma.$transaction(async (tx) => {
    for (const product of products) {
      await tx.wooProduct.upsert({
        where: { userId_productId: { userId, productId: product.productId } },
        create: {
          userId,
          productId: product.productId,
          parentId: product.parentId,
          name: product.name,
          slug: product.slug,
          permalink: product.permalink,
          sku: product.sku,
          upc: product.upc,
          type: product.type,
          status: product.status,
          stockStatus: product.stockStatus,
          price: product.price,
          regularPrice: product.regularPrice,
          stockQuantity: product.stockQuantity,
          thumbnailUrl: product.thumbnailUrl,
          description: product.description,
          categoriesJson: JSON.stringify(product.categories),
          listedOnStore: true,
          lastImportedAt: now,
        },
        update: {
          parentId: product.parentId,
          name: product.name,
          slug: product.slug,
          permalink: product.permalink,
          sku: product.sku,
          upc: product.upc,
          type: product.type,
          status: product.status,
          stockStatus: product.stockStatus,
          price: product.price,
          regularPrice: product.regularPrice,
          stockQuantity: product.stockQuantity,
          thumbnailUrl: product.thumbnailUrl,
          description: product.description,
          categoriesJson: JSON.stringify(product.categories),
          listedOnStore: true,
          lastImportedAt: now,
        },
      });
    }
    await tx.wooProduct.updateMany({
      where: { userId, productId: { notIn: productIds.length ? productIds : [-1] } },
      data: { listedOnStore: false },
    });
    await tx.wooProduct.deleteMany({
      where: {
        userId,
        listedOnStore: false,
        sourceForGunBroker: false,
        linkedItemId: null,
      },
    });
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
  if (row.linkedItemId) {
    await prisma.wooProduct.update({
      where: { userId_productId: { userId, productId } },
      data: { sourceForGunBroker: true },
    });
    return { itemId: row.linkedItemId, alreadyLinked: true as const };
  }

  const template = await prisma.listing.findFirst({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    select: { itemId: true },
  });
  if (!template) {
    throw new Error(
      "Import at least one GunBroker listing first. We use it as the posting template for linked WooCommerce items.",
    );
  }

  let description = row.description;
  if (!description) {
    try {
      const { secrets } = await credentialsFor(userId);
      const live = await getWooProduct(secrets, row.productId, row.parentId);
      description = live?.description ?? null;
      if (!description && row.parentId) {
        const parent = await getWooProduct(secrets, row.parentId);
        description = parent?.description ?? null;
      }
    } catch {
      description = null;
    }
  }

  const itemId = await cloneGunBrokerListing(userId, template.itemId, {
    preferredTitle: row.name,
    preferredDescription: description,
    preferredSku: row.sku,
    preferredUpc: row.upc,
    preferredPictureUrls: row.thumbnailUrl ? [row.thumbnailUrl] : null,
  });
  await commitListingQuick(userId, itemId, {
    quantity: Math.max(1, Math.round(row.stockQuantity ?? 1)),
    price: row.price ?? null,
  });

  await prisma.wooProduct.update({
    where: { userId_productId: { userId, productId } },
    data: {
      sourceForGunBroker: true,
      linkedItemId: itemId,
      description: description ?? undefined,
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
    await deleteGunBrokerListing(userId, row.linkedItemId);
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
