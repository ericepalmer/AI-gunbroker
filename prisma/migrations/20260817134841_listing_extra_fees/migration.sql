-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_listing" (
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
    "reservePrice" REAL,
    "collectorsElite" BOOLEAN NOT NULL DEFAULT false,
    "lastImportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastCommittedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "listing_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_listing" ("buyNowPrice", "createdAt", "description", "endingAt", "fixedPrice", "id", "isFixedPrice", "itemId", "lastCommittedAt", "lastImportedAt", "picturesJson", "price", "quantity", "sku", "startingBid", "subtitle", "thumbnailUrl", "title", "upc", "updatedAt", "userId") SELECT "buyNowPrice", "createdAt", "description", "endingAt", "fixedPrice", "id", "isFixedPrice", "itemId", "lastCommittedAt", "lastImportedAt", "picturesJson", "price", "quantity", "sku", "startingBid", "subtitle", "thumbnailUrl", "title", "upc", "updatedAt", "userId" FROM "listing";
DROP TABLE "listing";
ALTER TABLE "new_listing" RENAME TO "listing";
CREATE INDEX "listing_userId_idx" ON "listing"("userId");
CREATE UNIQUE INDEX "listing_userId_itemId_key" ON "listing"("userId", "itemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
