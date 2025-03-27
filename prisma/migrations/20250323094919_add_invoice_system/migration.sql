/*
  Warnings:

  - Added the required column `invoiceNumber` to the `Sale` table without a default value. This is not possible if the table is not empty.

*/

-- Primero agregamos la columna como nullable
ALTER TABLE "Sale" ADD COLUMN "invoiceNumber" TEXT;

-- Actualizamos las ventas existentes con un valor predeterminado
UPDATE "Sale" SET "invoiceNumber" = '0001' WHERE "invoiceNumber" IS NULL;

-- Ahora hacemos la columna NOT NULL
ALTER TABLE "Sale" ALTER COLUMN "invoiceNumber" SET NOT NULL;

-- AlterTable (agregamos las otras columnas)
ALTER TABLE "Sale" ADD COLUMN "cashierName" TEXT,
ADD COLUMN "taxId" TEXT;

-- AlterTable
ALTER TABLE "Store" ADD COLUMN "invoiceCounter" INTEGER NOT NULL DEFAULT 0;

-- Actualizar counters para las tiendas que ya tienen ventas
UPDATE "Store" s
SET "invoiceCounter" = (
    SELECT COUNT(*) FROM "Sale" WHERE "storeId" = s.id
)
WHERE EXISTS (SELECT 1 FROM "Sale" WHERE "storeId" = s.id);

-- CreateIndex
CREATE INDEX "Sale_storeId_invoiceNumber_idx" ON "Sale"("storeId", "invoiceNumber");
