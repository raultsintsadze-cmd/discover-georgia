import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { tripService } from "@/lib/services/impl/TripService";
import { jsonOk, jsonError, serviceErrorResponse } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToViewTrip"), 401);
  }
  const { id } = await params;

  try {
    const summary = await tripService.getSummary(id, session.user.id);
    return jsonOk(summary);
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
