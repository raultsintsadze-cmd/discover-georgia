-- CreateEnum
CREATE TYPE "InquiryStatus" AS ENUM ('PENDING', 'CONTACTED', 'CLOSED');

-- AlterTable: Activity.slug added nullable first -- 16 existing seeded
-- activities have no slug yet, so it can't go straight to NOT NULL. See
-- backfill below (mirrors PlaceService's slugify: lowercase, non-alphanumeric
-- runs collapsed to a single hyphen, trimmed) -- collision-safe here because
-- all 16 existing activity names are distinct once slugified.
ALTER TABLE "Activity" ADD COLUMN     "featuredVideoId" TEXT,
ADD COLUMN     "slug" TEXT;

UPDATE "Activity"
SET "slug" = trim(both '-' from regexp_replace(lower(name), '[^a-z0-9]+', '-', 'g'));

ALTER TABLE "Activity" ALTER COLUMN "slug" SET NOT NULL;

-- AlterTable
ALTER TABLE "Notification" ADD COLUMN     "activityInquiryId" TEXT;

-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "activityId" TEXT;

-- CreateTable
CREATE TABLE "SavedActivity" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SavedActivity_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ActivityInquiry" (
    "id" TEXT NOT NULL,
    "activityId" TEXT NOT NULL,
    "userId" TEXT,
    "contactName" TEXT NOT NULL,
    "contactEmail" TEXT NOT NULL,
    "message" TEXT,
    "status" "InquiryStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ActivityInquiry_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SavedActivity_userId_idx" ON "SavedActivity"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "SavedActivity_userId_activityId_key" ON "SavedActivity"("userId", "activityId");

-- CreateIndex
CREATE INDEX "ActivityInquiry_activityId_idx" ON "ActivityInquiry"("activityId");

-- CreateIndex
CREATE INDEX "ActivityInquiry_status_idx" ON "ActivityInquiry"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_slug_key" ON "Activity"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Activity_featuredVideoId_key" ON "Activity"("featuredVideoId");

-- CreateIndex
CREATE INDEX "Video_activityId_idx" ON "Video"("activityId");

-- AddForeignKey
ALTER TABLE "Video" ADD CONSTRAINT "Video_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedActivity" ADD CONSTRAINT "SavedActivity_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SavedActivity" ADD CONSTRAINT "SavedActivity_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Activity" ADD CONSTRAINT "Activity_featuredVideoId_fkey" FOREIGN KEY ("featuredVideoId") REFERENCES "Video"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityInquiry" ADD CONSTRAINT "ActivityInquiry_activityId_fkey" FOREIGN KEY ("activityId") REFERENCES "Activity"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ActivityInquiry" ADD CONSTRAINT "ActivityInquiry_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_activityInquiryId_fkey" FOREIGN KEY ("activityInquiryId") REFERENCES "ActivityInquiry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
