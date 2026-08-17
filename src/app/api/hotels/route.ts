import { NextRequest } from "next/server";
import { hotelService } from "@/lib/services/impl/HotelService";
import { jsonCached } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const hotels = await hotelService.search({
    regionSlug: sp.get("region") ?? undefined,
    maxPrice: sp.get("maxPrice") ? Number(sp.get("maxPrice")) : undefined,
    minRating: sp.get("minRating") ? Number(sp.get("minRating")) : undefined,
  });
  return jsonCached(hotels, 60);
}
