import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { placeService } from "@/lib/services/impl/PlaceService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  shortDescription: z.string().trim().min(1).max(300).optional(),
  description: z.string().trim().min(1).optional(),
  regionSlug: z.string().min(1).optional(),
  categorySlug: z.string().min(1).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  bestSeason: z.string().trim().max(100).optional(),
  recommendedDuration: z.number().int().min(0).optional(),
  difficulty: z.enum(["EASY", "MODERATE", "HARD"]).optional(),
  entranceFee: z.string().trim().max(100).optional(),
  parking: z.boolean().optional(),
  familyFriendly: z.boolean().optional(),
  tags: z.array(z.string().trim().min(1)).optional(),
  status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const { id } = await params;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidPlaceDetails"), 400, zodIssuesToFields(parsed.error.issues));
  }

  try {
    await placeService.updatePlace(id, parsed.data);
    return jsonOk({ updated: true });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const { id } = await params;

  try {
    await placeService.deletePlace(id);
    return jsonOk({ deleted: true });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
