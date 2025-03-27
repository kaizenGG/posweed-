/*
  Warnings:

  - You are about to drop the column `image` on the `Product` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[sku]` on the table `Product` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `sku` to the `Product` table without a default value. This is not possible if the table is not empty.
  - Made the column `category` on table `Product` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "Product" DROP COLUMN "image",
ADD COLUMN     "imageUrl" TEXT,
ADD COLUMN     "lowStockThreshold" INTEGER,
ADD COLUMN     "priceStrategy" TEXT,
ADD COLUMN     "sku" TEXT NOT NULL,
ALTER COLUMN "category" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Product_sku_key" ON "Product"("sku");

-- CreateIndex
CREATE INDEX "Product_storeId_idx" ON "Product"("storeId");

-- CreateIndex
CREATE INDEX "Product_category_idx" ON "Product"("category");

-- CreateIndex
CREATE INDEX "Product_sku_idx" ON "Product"("sku");
