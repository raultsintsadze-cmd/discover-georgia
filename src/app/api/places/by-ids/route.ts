import { NextRequest } from "next/server";
import { placeService } from "@/lib/services/impl/PlaceService";
import { jsonOk, jsonError } from "@/lib/api/response";

const MAX_IDS = 50;

/** Bulk lookup for client components that hold place ids without full summaries (e.g. TripMap after an edit). */
export async function GET(request: NextRequest) {
  const idsParam = request.nextUrl.searchParams.get("ids");
  if (!idsParam) {
    return jsonOk([]);
  }
  const ids = idsParam.split(",").filter(Boolean).slice(0, MAX_IDS);
  if (ids.length === 0) {
    return jsonOk([]);
  }
  if (idsParam.split(",").length > MAX_IDS) {
    return jsonError("VALIDATION_ERROR", `At most ${MAX_IDS} ids per request`, 400);
  }

  const places = await placeService.getManyByIds(ids);
  return jsonOk(places);
}
