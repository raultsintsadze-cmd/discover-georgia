import { NextRequest } from "next/server";
import { restaurantService } from "@/lib/services/impl/RestaurantService";
import { jsonCached } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const restaurants = await restaurantService.search({
    regionSlug: sp.get("region") ?? undefined,
    cuisine: sp.get("cuisine") ?? undefined,
    maxPriceLevel: sp.get("maxPriceLevel") ? Number(sp.get("maxPriceLevel")) : undefined,
  });
  return jsonCached(restaurants, 60);
}
