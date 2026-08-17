import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { pricingService } from "@/lib/services/impl/PricingService";
import { routeService } from "@/lib/services/impl/RouteService";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const adHocSchema = z.object({
  distanceMeters: z.coerce.number().min(0),
  tripDays: z.coerce.number().int().min(1),
});

/**
 * `?tripId=` uses that trip's real (already-calculated) route — Owner
 * only, since it reveals trip-specific day counts. `?distanceMeters=&
 * tripDays=` is a public, trip-independent estimate (e.g. a pricing
 * calculator). Both return the same TransportCostEstimate shape.
 */
export async function GET(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const sp = request.nextUrl.searchParams;
  const tripId = sp.get("tripId");

  if (tripId) {
    const session = await requireUserSession();
    if (!session) {
      return jsonError("UNAUTHENTICATED", t("signInToPriceTrip"), 401);
    }

    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId: session.user.id },
      select: { days: { select: { _count: { select: { places: true } } } } },
    });
    if (!trip) {
      return jsonError("NOT_FOUND", t("tripNotFound"), 404);
    }

    const route = await routeService.getTripRoute(tripId);
    if (route.segments.length === 0) {
      return jsonError("CONFLICT", t("routeNotCalculated"), 409);
    }

    const activeDays = trip.days.filter((d) => d._count.places > 0).length;
    const estimate = await pricingService.estimateTransportCost({
      distanceMeters: route.totalDistanceMeters,
      tripDays: activeDays,
    });
    return jsonOk(estimate);
  }

  const parsed = adHocSchema.safeParse({
    distanceMeters: sp.get("distanceMeters"),
    tripDays: sp.get("tripDays"),
  });
  if (!parsed.success) {
    return jsonError(
      "VALIDATION_ERROR",
      t("provideTripIdOrDistance"),
      400,
      zodIssuesToFields(parsed.error.issues)
    );
  }

  const estimate = await pricingService.estimateTransportCost(parsed.data);
  return jsonOk(estimate);
}
