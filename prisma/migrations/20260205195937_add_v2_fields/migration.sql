-- AlterTable
ALTER TABLE "TripIdea" ADD COLUMN     "externalUrl" TEXT,
ADD COLUMN     "sortOrder" INTEGER,
ADD COLUMN     "time" TEXT;

-- CreateTable
CREATE TABLE "EventPhoto" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EventPhoto_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EventPhoto_ideaId_idx" ON "EventPhoto"("ideaId");

-- AddForeignKey
ALTER TABLE "EventPhoto" ADD CONSTRAINT "EventPhoto_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "TripIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;
