import { prisma } from "@/lib/db/client";
import { jsonCached } from "@/lib/api/response";

export async function GET() {
  const categories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, icon: true },
  });
  return jsonCached(categories, 3600);
}
