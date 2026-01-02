/*
  Warnings:

  - A unique constraint covering the columns `[reviewToken]` on the table `Trip` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Trip" ADD COLUMN     "reviewToken" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Trip_reviewToken_key" ON "Trip"("reviewToken");
