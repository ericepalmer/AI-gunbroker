-- AlterTable
ALTER TABLE "sold_order" ADD COLUMN "gunBrokerNotified" BOOLEAN NOT NULL DEFAULT false;

-- Backfill from GunBroker-complete signals (never from ShipStation).
UPDATE "sold_order"
SET "gunBrokerNotified" = true
WHERE "orderComplete" = true OR "orderStatus" = 5;

-- CreateIndex
CREATE INDEX "sold_order_userId_gunBrokerNotified_idx" ON "sold_order"("userId", "gunBrokerNotified");
