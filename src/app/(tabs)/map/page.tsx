import { prisma } from "@/lib/db/client";
import { MapExplorer } from "@/components/map/MapExplorer";

export default async function MapPage() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { slug: true, name: true },
  });

  return <MapExplorer categories={categories} />;
}
