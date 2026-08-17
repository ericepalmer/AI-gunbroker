-- AlterTable
ALTER TABLE "listing" ADD COLUMN "condition" INTEGER;
ALTER TABLE "listing" ADD COLUMN "isFflRequired" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "listing" ADD COLUMN "weight" REAL;
ALTER TABLE "listing" ADD COLUMN "weightUnit" INTEGER;
