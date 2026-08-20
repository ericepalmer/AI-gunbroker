import { Prisma, PrismaClient } from "@prisma/client";

const PRISMA_CLIENT_REV = 27;
const WOO_CLIENT_SHAPE = Object.values(Prisma.WooProductScalarFieldEnum).sort().join(",");
const SOLD_ORDER_SHAPE = Object.values(Prisma.SoldOrderScalarFieldEnum).sort().join(",");
export const WOO_PRODUCT_HAS_ATTRIBUTES_JSON = "attributesJson" in Prisma.WooProductScalarFieldEnum;
export const SOLD_ORDER_HAS_DETAILS_JSON = "detailsJson" in Prisma.SoldOrderScalarFieldEnum;
export const SOLD_ORDER_HAS_SHIPSTATION =
  "shipStationOrderId" in Prisma.SoldOrderScalarFieldEnum;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaRev?: number;
  wooShape?: string;
  soldOrderShape?: string;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function isCurrentClient(client: PrismaClient | undefined) {
  return (
    Boolean(client) &&
    globalForPrisma.prismaRev === PRISMA_CLIENT_REV &&
    globalForPrisma.wooShape === WOO_CLIENT_SHAPE &&
    globalForPrisma.soldOrderShape === SOLD_ORDER_SHAPE &&
    SOLD_ORDER_HAS_DETAILS_JSON &&
    SOLD_ORDER_HAS_SHIPSTATION &&
    typeof client?.listing?.findMany === "function" &&
    typeof client?.wooProduct?.findMany === "function" &&
    typeof client?.soldOrder?.findMany === "function"
  );
}

const existing = globalForPrisma.prisma;
if (existing && !isCurrentClient(existing)) {
  void existing.$disconnect();
  globalForPrisma.prisma = undefined;
}

export const prisma = isCurrentClient(globalForPrisma.prisma)
  ? globalForPrisma.prisma!
  : createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
  globalForPrisma.prismaRev = PRISMA_CLIENT_REV;
  globalForPrisma.wooShape = WOO_CLIENT_SHAPE;
  globalForPrisma.soldOrderShape = SOLD_ORDER_SHAPE;
}
