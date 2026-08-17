-- AlterTable
ALTER TABLE "TripRequest" ADD COLUMN "idempotencyKey" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "TripRequest_userId_idempotencyKey_key" ON "TripRequest"("userId", "idempotencyKey");
