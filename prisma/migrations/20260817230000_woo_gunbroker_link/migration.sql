-- AlterTable
ALTER TABLE "woo_product" ADD COLUMN "sourceForGunBroker" BOOLEAN NOT NULL DEFAULT 0;
ALTER TABLE "woo_product" ADD COLUMN "linkedItemId" TEXT;
ALTER TABLE "woo_product" ADD COLUMN "quantitySource" TEXT NOT NULL DEFAULT 'woocommerce';
ALTER TABLE "woo_product" ADD COLUMN "manualQuantity" INTEGER;
ALTER TABLE "woo_product" ADD COLUMN "listedOnStore" BOOLEAN NOT NULL DEFAULT 1;

-- CreateIndex
CREATE INDEX "woo_product_userId_linkedItemId_idx" ON "woo_product"("userId", "linkedItemId");
