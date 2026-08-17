-- AlterTable
ALTER TABLE "listing" ADD COLUMN "manufacturer" TEXT;
ALTER TABLE "listing" ADD COLUMN "caliber" TEXT;
ALTER TABLE "listing" ADD COLUMN "rounds" INTEGER;
ALTER TABLE "listing" ADD COLUMN "mfgPartNumber" TEXT;
ALTER TABLE "listing" ADD COLUMN "serialNumber" TEXT;
ALTER TABLE "listing" ADD COLUMN "gtin" TEXT;
ALTER TABLE "listing" ADD COLUMN "excludeStates" TEXT NOT NULL DEFAULT '';
ALTER TABLE "listing" ADD COLUMN "listingDuration" INTEGER;
ALTER TABLE "listing" ADD COLUMN "autoRelist" INTEGER;
ALTER TABLE "listing" ADD COLUMN "autoRelistFixedCount" INTEGER;
