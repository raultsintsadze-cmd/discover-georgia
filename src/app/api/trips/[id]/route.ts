import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { tripService } from "@/lib/services/impl/TripService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  travelers: z.number().int().min(1).max(20).optional(),
  budget: z.number().min(0).optional(),
  startLocation: z.string().trim().max(200).optional(),
  endLocation: z.string().trim().max(200).optional(),
  preferences: z.record(z.unknown()).optional(),
  preferredDriverId: z.string().min(1).nullable().optional(),
});

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToViewTrip"), 401);
  }
  const { id } = await params;
  const trip = await tripService.getTrip(id, session.user.id);
  if (!trip) {
    return jsonError("NOT_FOUND", t("tripNotFound"), 404);
  }
  return jsonOk(trip);
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToEditTrip"), 401);
  }
  const { id } = await params;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidTripDetails"), 400, zodIssuesToFields(parsed.error.issues));
  }

  try {
    const trip = await tripService.updateTrip(id, session.user.id, parsed.data);
    return jsonOk(trip);
  } catch (err) {
    return serviceErrorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToDeleteTrip"), 401);
  }
  const { id } = await params;

  try {
    await tripService.deleteTrip(id, session.user.id);
    return jsonOk({ deleted: true });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
