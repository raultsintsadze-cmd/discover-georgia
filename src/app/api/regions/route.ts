import { prisma } from "@/lib/db/client";
import { jsonCached } from "@/lib/api/response";

export async function GET() {
  const regions = await prisma.region.findMany({
    orderBy: { name: "asc" },
    select: { id: true, slug: true, name: true, description: true },
  });
  return jsonCached(regions, 3600);
}
