import { PrismaClient } from "@prisma/client";

const PRISMA_CLIENT_REV = 8;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
  prismaRev?: number;
};

function createPrismaClient() {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

function isCurrentClient(client: PrismaClient | undefined) {
  return (
    globalForPrisma.prismaRev === PRISMA_CLIENT_REV &&
    typeof client?.listing?.findMany === "function"
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
}
