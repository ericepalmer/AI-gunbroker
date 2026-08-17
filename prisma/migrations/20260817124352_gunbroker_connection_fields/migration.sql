-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_integration" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "environment" TEXT NOT NULL DEFAULT 'sandbox',
    "username" TEXT,
    "secretsCipher" TEXT,
    "externalUserId" TEXT,
    "externalUsername" TEXT,
    "lastVerifiedAt" DATETIME,
    "lastError" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "integration_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_integration" ("createdAt", "id", "provider", "status", "updatedAt", "userId") SELECT "createdAt", "id", "provider", "status", "updatedAt", "userId" FROM "integration";
DROP TABLE "integration";
ALTER TABLE "new_integration" RENAME TO "integration";
CREATE UNIQUE INDEX "integration_userId_provider_key" ON "integration"("userId", "provider");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
