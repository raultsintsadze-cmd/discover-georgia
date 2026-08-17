-- AlterTable
ALTER TABLE "Region"
  ADD COLUMN "nameKa" TEXT,
  ADD COLUMN "nameRu" TEXT,
  ADD COLUMN "descriptionKa" TEXT,
  ADD COLUMN "descriptionRu" TEXT;

-- AlterTable
ALTER TABLE "Category"
  ADD COLUMN "nameKa" TEXT,
  ADD COLUMN "nameRu" TEXT;

-- AlterTable
ALTER TABLE "Place"
  ADD COLUMN "nameKa" TEXT,
  ADD COLUMN "nameRu" TEXT,
  ADD COLUMN "shortDescriptionKa" TEXT,
  ADD COLUMN "shortDescriptionRu" TEXT,
  ADD COLUMN "descriptionKa" TEXT,
  ADD COLUMN "descriptionRu" TEXT;
