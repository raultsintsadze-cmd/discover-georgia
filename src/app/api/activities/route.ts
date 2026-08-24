import { NextRequest } from "next/server";
import { activityService } from "@/lib/services/impl/ActivityService";
import { jsonCached } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;

  // Scoped to one place — used by the video submission form's activity
  // picker (works for any place, not a specific one) — takes precedence
  // over the region/category search filters below, which are unrelated.
  const placeId = sp.get("place");
  if (placeId) {
    const activities = await activityService.listNearPlace(placeId);
    return jsonCached(activities, 60);
  }

  const category = sp.get("category") as "TOUR" | "WINE_TASTING" | "ADVENTURE" | "CULTURE" | "GENERAL" | null;
  const activities = await activityService.search({
    regionSlug: sp.get("region") ?? undefined,
    category: category ?? undefined,
  });
  return jsonCached(activities, 60);
}
