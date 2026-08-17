import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { tripService } from "@/lib/services/impl/TripService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";

const bodySchema = z.object({
  dayNumber: z.number().int().min(1),
  placeId: z.string().min(1),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToEditTrip"), 401);
  }
  const { id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidRequest"), 400, zodIssuesToFields(parsed.error.issues));
  }

  try {
    const trip = await tripService.addPlace(id, session.user.id, parsed.data.dayNumber, parsed.data.placeId);
    return jsonOk(trip);
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
