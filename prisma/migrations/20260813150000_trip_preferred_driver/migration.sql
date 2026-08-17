-- AlterTable
ALTER TABLE "Trip" ADD COLUMN "preferredDriverId" TEXT;

-- AddForeignKey
ALTER TABLE "Trip" ADD CONSTRAINT "Trip_preferredDriverId_fkey" FOREIGN KEY ("preferredDriverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
