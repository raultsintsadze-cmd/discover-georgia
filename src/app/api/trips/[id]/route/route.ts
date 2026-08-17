import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { tripService } from "@/lib/services/impl/TripService";
import { routeService } from "@/lib/services/impl/RouteService";
import { jsonOk, jsonError, serviceErrorResponse } from "@/lib/api/response";

async function assertOwnership(tripId: string, userId: string) {
  const trip = await tripService.getTrip(tripId, userId);
  if (!trip) {
    throw new Error("Trip not found");
  }
}

/** Reads cached segments without recomputing — empty if calculateTripRoute hasn't run since the last edit. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToViewTrip"), 401);
  }
  const { id } = await params;

  try {
    await assertOwnership(id, session.user.id);
    const route = await routeService.getTripRoute(id);
    return jsonOk(route);
  } catch (err) {
    return serviceErrorResponse(err);
  }
}

/** (Re)computes every leg via the real routing provider and persists it. */
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToEditTrip"), 401);
  }
  const { id } = await params;

  try {
    await assertOwnership(id, session.user.id);
    const route = await routeService.calculateTripRoute(id);
    return jsonOk(route);
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
