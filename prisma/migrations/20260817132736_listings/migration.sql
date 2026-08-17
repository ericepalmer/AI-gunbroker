-- CreateTable
CREATE TABLE "listing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "itemId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subtitle" TEXT,
    "description" TEXT,
    "thumbnailUrl" TEXT,
    "picturesJson" TEXT NOT NULL DEFAULT '[]',
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" REAL,
    "startingBid" REAL,
    "buyNowPrice" REAL,
    "fixedPrice" REAL,
    "isFixedPrice" BOOLEAN NOT NULL DEFAULT false,
    "endingAt" DATETIME,
    "sku" TEXT,
    "upc" TEXT,
    "lastImportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCommittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "listing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "listing_userId_idx" ON "listing"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "listing_userId_itemId_key" ON "listing"("userId", "itemId");
