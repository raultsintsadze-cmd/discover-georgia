import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { placeService } from "@/lib/services/impl/PlaceService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  shortDescription: z.string().trim().min(1).max(300),
  description: z.string().trim().min(1),
  regionSlug: z.string().min(1),
  categorySlug: z.string().min(1),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  bestSeason: z.string().trim().max(100).optional(),
  recommendedDuration: z.number().int().min(0).optional(),
  difficulty: z.enum(["EASY", "MODERATE", "HARD"]).optional(),
  entranceFee: z.string().trim().max(100).optional(),
  parking: z.boolean().optional(),
  familyFriendly: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const places = await placeService.adminList();
  return jsonOk(places);
}

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidPlaceDetails"), 400, zodIssuesToFields(parsed.error.issues));
  }

  try {
    const place = await placeService.createPlace(parsed.data);
    return jsonOk(place, { status: 201 });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
