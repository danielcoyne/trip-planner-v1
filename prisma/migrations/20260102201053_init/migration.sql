-- CreateTable
CREATE TABLE "Trip" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "destination" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "currentRound" INTEGER NOT NULL DEFAULT 1,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "requirements" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Trip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripIdea" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "placeId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "day" INTEGER,
    "mealSlot" TEXT,
    "agentNotes" TEXT,
    "status" TEXT NOT NULL DEFAULT 'SUGGESTED',
    "roundCreated" INTEGER NOT NULL DEFAULT 1,
    "suggestedBy" TEXT NOT NULL DEFAULT 'AGENT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TripIdea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GooglePlaceCache" (
    "placeId" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "formattedAddress" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "googleMapsUri" TEXT NOT NULL,
    "types" TEXT[],
    "rating" DOUBLE PRECISION,
    "cachedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GooglePlaceCache_pkey" PRIMARY KEY ("placeId")
);

-- CreateTable
CREATE TABLE "IdeaReaction" (
    "id" TEXT NOT NULL,
    "ideaId" TEXT NOT NULL,
    "reaction" TEXT NOT NULL,
    "clientNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IdeaReaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClientSuggestion" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "suggestionText" TEXT NOT NULL,
    "round" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "resolvedPlaceId" TEXT,
    "agentNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ClientSuggestion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TripIdea_tripId_idx" ON "TripIdea"("tripId");

-- CreateIndex
CREATE INDEX "TripIdea_placeId_idx" ON "TripIdea"("placeId");

-- CreateIndex
CREATE INDEX "GooglePlaceCache_expiresAt_idx" ON "GooglePlaceCache"("expiresAt");

-- CreateIndex
CREATE INDEX "IdeaReaction_ideaId_idx" ON "IdeaReaction"("ideaId");

-- CreateIndex
CREATE INDEX "ClientSuggestion_tripId_idx" ON "ClientSuggestion"("tripId");

-- AddForeignKey
ALTER TABLE "TripIdea" ADD CONSTRAINT "TripIdea_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdeaReaction" ADD CONSTRAINT "IdeaReaction_ideaId_fkey" FOREIGN KEY ("ideaId") REFERENCES "TripIdea"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClientSuggestion" ADD CONSTRAINT "ClientSuggestion_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "Trip"("id") ON DELETE CASCADE ON UPDATE CASCADE;
