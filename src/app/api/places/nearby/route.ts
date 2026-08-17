import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { placeService } from "@/lib/services/impl/PlaceService";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const querySchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lng: z.coerce.number().min(-180).max(180),
  radiusKm: z.coerce.number().positive().max(500).optional().default(25),
  limit: z.coerce.number().int().positive().max(100).optional().default(20),
});

export async function GET(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const sp = request.nextUrl.searchParams;
  const parsed = querySchema.safeParse({
    lat: sp.get("lat") ?? undefined,
    lng: sp.get("lng") ?? undefined,
    radiusKm: sp.get("radiusKm") ?? undefined,
    limit: sp.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("latLngRequired"), 400, zodIssuesToFields(parsed.error.issues));
  }

  const { lat, lng, radiusKm, limit } = parsed.data;
  const places = await placeService.getNearby({ latitude: lat, longitude: lng }, radiusKm, limit);
  return jsonOk(places);
}
