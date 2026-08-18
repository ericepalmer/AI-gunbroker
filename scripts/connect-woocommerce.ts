import { PrismaClient } from "@prisma/client";
import {
  connectWooCommerceStore,
  importWooCommerceProducts,
} from "../src/lib/woocommerce/service";

const prisma = new PrismaClient();

async function main() {
  const storeUrl = process.env.WOO_STORE_URL;
  const consumerKey = process.env.WOO_CONSUMER_KEY;
  const consumerSecret = process.env.WOO_CONSUMER_SECRET;
  const email = process.env.WOO_CHAMBER_EMAIL ?? "eric@sleepingdogammo.com";
  if (!storeUrl || !consumerKey || !consumerSecret) {
    throw new Error("Set WOO_STORE_URL, WOO_CONSUMER_KEY, and WOO_CONSUMER_SECRET.");
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(`No Chamber user for ${email}`);
  }

  await connectWooCommerceStore(user.id, { storeUrl, consumerKey, consumerSecret });
  const imported = await importWooCommerceProducts(user.id);
  console.log(`Connected ${email} to ${imported.storeUrl} (${imported.count} products)`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
