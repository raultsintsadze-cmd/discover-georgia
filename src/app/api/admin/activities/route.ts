import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { activityService } from "@/lib/services/impl/ActivityService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  nearPlaceId: z.string().min(1),
  category: z.enum(["TOUR", "WINE_TASTING", "ADVENTURE", "CULTURE", "GENERAL"]),
  description: z.string().trim().max(1000).optional(),
  rating: z.number().min(0).max(5).optional(),
  price: z.number().min(0).optional(),
  bookingUrl: z.string().url().optional(),
});

export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const activities = await activityService.adminList();
  return jsonOk(activities);
}

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidActivityDetails"), 400, zodIssuesToFields(parsed.error.issues));
  }

  try {
    const activity = await activityService.createActivity(parsed.data);
    return jsonOk(activity, { status: 201 });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
