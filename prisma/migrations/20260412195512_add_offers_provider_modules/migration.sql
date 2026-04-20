-- CreateEnum
CREATE TYPE "OfferStatus" AS ENUM ('PENDING', 'SEEN', 'COUNTER_OFFERED', 'ACCEPTED', 'REJECTED', 'EXPIRED', 'WITHDRAWN');

-- CreateTable
CREATE TABLE "offers" (
    "id" TEXT NOT NULL,
    "requestId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,
    "message" TEXT,
    "proposedDate" TIMESTAMP(3),
    "proposedSlot" TEXT,
    "estimatedHours" DOUBLE PRECISION,
    "validUntil" TIMESTAMP(3),
    "status" "OfferStatus" NOT NULL DEFAULT 'PENDING',
    "counterPrice" DOUBLE PRECISION,
    "counterMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "offers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "offers_requestId_providerId_key" ON "offers"("requestId", "providerId");

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_requestId_fkey" FOREIGN KEY ("requestId") REFERENCES "service_requests"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "offers" ADD CONSTRAINT "offers_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "provider_accounts"("id") ON DELETE CASCADE ON UPDATE CASCADE;
