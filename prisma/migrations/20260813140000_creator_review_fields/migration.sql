-- AlterTable
ALTER TABLE "Creator" ADD COLUMN "reviewedByAdminId" TEXT,
                      ADD COLUMN "reviewNotes" TEXT;

-- AddForeignKey
ALTER TABLE "Creator" ADD CONSTRAINT "Creator_reviewedByAdminId_fkey" FOREIGN KEY ("reviewedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
