-- AlterTable
ALTER TABLE "sold_order" ADD COLUMN "shipStationOrderId" TEXT;
ALTER TABLE "sold_order" ADD COLUMN "shipStationStatus" TEXT;
ALTER TABLE "sold_order" ADD COLUMN "shipStationSyncedAt" DATETIME;
