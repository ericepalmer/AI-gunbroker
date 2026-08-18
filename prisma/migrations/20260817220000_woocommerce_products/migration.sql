-- CreateTable
CREATE TABLE "woo_product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "productId" INTEGER NOT NULL,
    "parentId" INTEGER NOT NULL DEFAULT 0,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "permalink" TEXT,
    "sku" TEXT,
    "upc" TEXT,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "stockStatus" TEXT NOT NULL,
    "price" REAL,
    "regularPrice" REAL,
    "stockQuantity" INTEGER,
    "thumbnailUrl" TEXT,
    "categoriesJson" TEXT NOT NULL DEFAULT '[]',
    "lastImportedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "woo_product_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "woo_product_userId_idx" ON "woo_product"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "woo_product_userId_productId_key" ON "woo_product"("userId", "productId");
