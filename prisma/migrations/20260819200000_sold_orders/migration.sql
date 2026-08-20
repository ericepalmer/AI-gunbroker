-- CreateTable
CREATE TABLE "sold_order" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "orderStatus" INTEGER NOT NULL DEFAULT 0,
    "orderStatusLabel" TEXT,
    "itemShipped" BOOLEAN NOT NULL DEFAULT false,
    "orderComplete" BOOLEAN NOT NULL DEFAULT false,
    "buyerUsername" TEXT,
    "buyerName" TEXT,
    "orderDate" DATETIME,
    "totalAmount" REAL,
    "itemCount" INTEGER NOT NULL DEFAULT 1,
    "title" TEXT,
    "thumbnailUrl" TEXT,
    "itemIdsJson" TEXT NOT NULL DEFAULT '[]',
    "itemsJson" TEXT NOT NULL DEFAULT '[]',
    "shipToJson" TEXT NOT NULL DEFAULT '{}',
    "trackingNumber" TEXT,
    "carrier" TEXT,
    "workStatus" TEXT NOT NULL DEFAULT 'pending',
    "completedAt" DATETIME,
    "lastImportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "sold_order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "sold_order_userId_orderId_key" ON "sold_order"("userId", "orderId");

-- CreateIndex
CREATE INDEX "sold_order_userId_workStatus_idx" ON "sold_order"("userId", "workStatus");

-- CreateIndex
CREATE INDEX "sold_order_userId_orderStatus_idx" ON "sold_order"("userId", "orderStatus");
