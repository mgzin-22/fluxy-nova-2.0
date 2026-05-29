-- AlterTable
ALTER TABLE "Product" ADD COLUMN     "imageUrl" TEXT;

-- AlterTable
ALTER TABLE "Venda" ADD COLUMN     "categoria" TEXT,
ADD COLUMN     "precoUnitario" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "productId" TEXT,
ADD COLUMN     "quantidade" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "status" TEXT NOT NULL DEFAULT 'Concluída';

-- AddForeignKey
ALTER TABLE "Venda" ADD CONSTRAINT "Venda_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;
