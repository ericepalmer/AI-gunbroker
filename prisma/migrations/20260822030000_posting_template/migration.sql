-- CreateTable
CREATE TABLE "posting_template" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "isFixedPrice" BOOLEAN NOT NULL DEFAULT true,
    "listingDuration" INTEGER NOT NULL DEFAULT 90,
    "autoRelist" INTEGER NOT NULL DEFAULT 4,
    "autoRelistFixedCount" INTEGER,
    "defaultCondition" INTEGER NOT NULL DEFAULT 1,
    "weight" REAL DEFAULT 2,
    "weightUnit" INTEGER NOT NULL DEFAULT 1,
    "inspectionPeriod" INTEGER NOT NULL DEFAULT 1,
    "whoPaysForShipping" INTEGER NOT NULL DEFAULT 4,
    "shippingProfileId" INTEGER,
    "shippingClassesJson" TEXT NOT NULL DEFAULT '{"Ground":true}',
    "shippingClassCostsJson" TEXT NOT NULL DEFAULT '{}',
    "paymentMethodsJson" TEXT NOT NULL DEFAULT '{"VisaMastercard":true,"Amex":true,"Discover":true}',
    "excludeStates" TEXT NOT NULL DEFAULT 'CA,DC,DE,HI,IL,MA,NJ,NY,RI',
    "willShipInternational" BOOLEAN NOT NULL DEFAULT false,
    "prop65Warning" TEXT NOT NULL DEFAULT '',
    "canOffer" BOOLEAN NOT NULL DEFAULT false,
    "standardTextId" INTEGER,
    "collectorsElite" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "posting_template_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "posting_template_userId_key" ON "posting_template"("userId");
