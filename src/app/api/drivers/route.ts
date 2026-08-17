import { NextRequest } from "next/server";
import { driverService } from "@/lib/services/impl/DriverService";
import { jsonCached } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const drivers = await driverService.listAvailable({
    regionSlug: sp.get("region") ?? undefined,
    minSeats: sp.get("minSeats") ? Number(sp.get("minSeats")) : undefined,
    languages: sp.get("languages")?.split(",").filter(Boolean),
  });
  // Shorter window than other catalog data — availability toggles more often.
  return jsonCached(drivers, 30);
}
