import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { tripService } from "@/lib/services/impl/TripService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";

const createSchema = z.object({
  name: z.string().trim().min(1).max(100),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  travelers: z.number().int().min(1).max(20).optional(),
  budget: z.number().min(0).optional(),
  startLocation: z.string().trim().max(200).optional(),
  endLocation: z.string().trim().max(200).optional(),
});

export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToViewTrips"), 401);
  }
  const trips = await tripService.listTrips(session.user.id);
  return jsonOk(trips);
}

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToCreateTrip"), 401);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidTripDetails"), 400, zodIssuesToFields(parsed.error.issues));
  }

  try {
    const trip = await tripService.createTrip(session.user.id, parsed.data);
    return jsonOk(trip, { status: 201 });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
