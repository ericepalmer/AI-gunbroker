-- AlterTable
ALTER TABLE "sold_order" ADD COLUMN "deliveryStatus" TEXT;
ALTER TABLE "sold_order" ADD COLUMN "deliveryStatusLabel" TEXT;
ALTER TABLE "sold_order" ADD COLUMN "estimatedDeliveryAt" DATETIME;
ALTER TABLE "sold_order" ADD COLUMN "deliveredAt" DATETIME;
ALTER TABLE "sold_order" ADD COLUMN "trackingSyncedAt" DATETIME;
