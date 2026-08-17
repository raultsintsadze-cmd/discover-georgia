import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireDriverSession } from "@/lib/auth/guards";
import { bookingService } from "@/lib/services/impl/BookingService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";

const bodySchema = z.object({ status: z.enum(["DRIVER_ACCEPTED", "CANCELLED"]) });

/** Accept/decline only — a status transition, nothing else about the request is editable here. */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const driverSession = await requireDriverSession();
  if (!driverSession) {
    return jsonError("UNAUTHENTICATED", t("signInAsDriverToRespond"), 401);
  }
  const { id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidStatus"), 400, zodIssuesToFields(parsed.error.issues));
  }

  try {
    const tripRequest = await bookingService.updateStatus(id, parsed.data.status, driverSession.session.user.id);
    return jsonOk(tripRequest);
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
