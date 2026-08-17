import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { driverService } from "@/lib/services/impl/DriverService";
import { routeService } from "@/lib/services/impl/RouteService";
import { pricingService, computeTransportCost } from "@/lib/services/impl/PricingService";
import { jsonOk, jsonError } from "@/lib/api/response";

/**
 * Available drivers with a per-driver estimated price for this specific
 * trip (spec §27 driver card). A driver's own pricePerKm/dailyRate/
 * minimumTripPrice override the platform default where set; additional
 * fees always come from the platform rule (they're not driver-specific).
 */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToViewDriversForTrip"), 401);
  }
  const { id: tripId } = await params;

  const trip = await prisma.trip.findFirst({
    where: { id: tripId, userId: session.user.id },
    select: { days: { select: { _count: { select: { places: true } } } } },
  });
  if (!trip) {
    return jsonError("NOT_FOUND", t("tripNotFound"), 404);
  }

  const [route, drivers, activeRule] = await Promise.all([
    routeService.getTripRoute(tripId),
    driverService.listAvailable({}),
    pricingService.getActiveRule(),
  ]);
  const routeComputed = route.segments.length > 0;
  const activeDays = trip.days.filter((d) => d._count.places > 0).length;

  const driversWithPricing = drivers.map((driver) => ({
    ...driver,
    estimatedPriceGel: routeComputed
      ? computeTransportCost(
          {
            pricePerKm: driver.pricePerKm ?? activeRule.pricePerKm,
            dailyDriverRate: driver.dailyRate ?? activeRule.dailyDriverRate,
            minimumTripPrice: driver.minimumTripPrice ?? activeRule.minimumTripPrice,
            fuelRate: activeRule.fuelRate,
            additionalFees: activeRule.additionalFees,
          },
          route.totalDistanceMeters,
          activeDays
        ).total.amount / 100
      : null,
  }));

  return jsonOk({ routeComputed, drivers: driversWithPricing });
}
