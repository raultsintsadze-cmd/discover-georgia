-- AlterTable
ALTER TABLE "VideoSubmission" ADD COLUMN     "existingActivityId" TEXT;

-- CreateIndex
CREATE INDEX "VideoSubmission_existingActivityId_idx" ON "VideoSubmission"("existingActivityId");

-- AddForeignKey
ALTER TABLE "VideoSubmission" ADD CONSTRAINT "VideoSubmission_existingActivityId_fkey" FOREIGN KEY ("existingActivityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;
