import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { tripService } from "@/lib/services/impl/TripService";
import { jsonOk, jsonError, serviceErrorResponse } from "@/lib/api/response";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; tripPlaceId: string }> }
) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToEditTrip"), 401);
  }
  const { id, tripPlaceId } = await params;

  try {
    const trip = await tripService.removePlace(id, session.user.id, tripPlaceId);
    return jsonOk(trip);
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
