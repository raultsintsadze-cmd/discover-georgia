-- AlterTable
ALTER TABLE "Driver" ADD COLUMN "reviewedByAdminId" TEXT,
                     ADD COLUMN "reviewNotes" TEXT;

-- AddForeignKey
ALTER TABLE "Driver" ADD CONSTRAINT "Driver_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
