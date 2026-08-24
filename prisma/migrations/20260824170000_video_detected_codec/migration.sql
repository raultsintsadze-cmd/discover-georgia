-- AlterTable
ALTER TABLE "Video" ADD COLUMN     "detectedCodec" TEXT;

-- AlterTable
ALTER TABLE "VideoSubmission" ADD COLUMN     "detectedCodec" TEXT;
