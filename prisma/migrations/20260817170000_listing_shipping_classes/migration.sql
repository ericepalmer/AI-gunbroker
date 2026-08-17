-- AlterTable
ALTER TABLE "listing" ADD COLUMN "whoPaysForShipping" INTEGER;
ALTER TABLE "listing" ADD COLUMN "shippingProfileId" INTEGER;
ALTER TABLE "listing" ADD COLUMN "shippingClassesJson" TEXT NOT NULL DEFAULT '{}';
ALTER TABLE "listing" ADD COLUMN "shippingClassCostsJson" TEXT NOT NULL DEFAULT '{}';
