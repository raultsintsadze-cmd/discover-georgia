import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { bookingService } from "@/lib/services/impl/BookingService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";

const bodySchema = z.object({
  tripId: z.string().min(1),
  driverId: z.string().min(1).optional(),
  passengers: z.number().int().min(1).max(20),
  notes: z.string().trim().max(1000).optional(),
});

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToRequestTrip"), 401);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidTripRequestDetails"), 400, zodIssuesToFields(parsed.error.issues));
  }

  // Deduplicates a retried request on a flaky connection — see docs/api.md §1.
  const idempotencyKey = request.headers.get("Idempotency-Key") ?? undefined;

  try {
    const tripRequest = await bookingService.createTripRequest(session.user.id, { ...parsed.data, idempotencyKey });
    return jsonOk(tripRequest, { status: 201 });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
