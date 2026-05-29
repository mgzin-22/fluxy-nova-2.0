-- AlterTable
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN IF NOT EXISTS "categoria" TEXT,
ADD COLUMN IF NOT EXISTS "precoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS "productId" TEXT,
ADD COLUMN IF NOT EXISTS "quantidade" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'Concluída';

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Venda_productId_fkey'
  ) THEN
    ALTER TABLE "Venda"
    ADD CONSTRAINT "Venda_productId_fkey"
    FOREIGN KEY ("productId")
    REFERENCES "Product"("id")
    ON DELETE SET NULL
    ON UPDATE CASCADE;
  END IF;
END $$;