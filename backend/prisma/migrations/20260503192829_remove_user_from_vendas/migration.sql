/*
  Warnings:

  - You are about to drop the column `userId` on the `Venda` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Venda" DROP CONSTRAINT "Venda_userId_fkey";

-- AlterTable
ALTER TABLE "Venda" DROP COLUMN "userId";
