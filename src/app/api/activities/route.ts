import { NextRequest } from "next/server";
import { activityService } from "@/lib/services/impl/ActivityService";
import { jsonCached } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const category = sp.get("category") as "TOUR" | "WINE_TASTING" | "ADVENTURE" | "CULTURE" | "GENERAL" | null;
  const activities = await activityService.search({
    regionSlug: sp.get("region") ?? undefined,
    category: category ?? undefined,
  });
  return jsonCached(activities, 60);
}
