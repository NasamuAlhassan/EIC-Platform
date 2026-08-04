-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "DeliveryStatus" ADD VALUE 'DELIVERED';
ALTER TYPE "DeliveryStatus" ADD VALUE 'UNDELIVERED';

-- AlterTable
ALTER TABLE "Broadcast" ADD COLUMN     "deliveredCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "BroadcastRecipient" ADD COLUMN     "deliveredAt" TIMESTAMP(3);

-- CreateIndex
CREATE INDEX "BroadcastRecipient_providerMessageId_idx" ON "BroadcastRecipient"("providerMessageId");
