import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";
import type { RouteService, RouteSegment, TripRouteResult } from "../route.service";
import type { RoutingProvider } from "@/lib/providers/routing/types";
import type { LineStringGeometry } from "@/lib/types/domain";
import { googleRoutingProvider } from "@/lib/providers/routing/google";

function sumTotals(segments: RouteSegment[]): Omit<TripRouteResult, "segments"> {
  return {
    totalDistanceMeters: segments.reduce((sum, s) => sum + s.distanceMeters, 0),
    totalDurationSeconds: segments.reduce((sum, s) => sum + s.durationSeconds, 0),
  };
}

/**
 * Prisma-backed RouteService. The only place trip distance/duration/
 * geometry gets computed — always via a real routing provider, persisted
 * as Route rows. See TripService's addPlace/removePlace/reorderPlaces for
 * the invalidation half of this contract: any itinerary edit deletes the
 * trip's Route rows so a stale total is never shown as current.
 */
export class PrismaRouteService implements RouteService {
  constructor(private readonly provider: RoutingProvider) {}

  async calculateTripRoute(tripId: string): Promise<TripRouteResult> {
    const trip = await prisma.trip.findUniqueOrThrow({
      where: { id: tripId },
      include: {
        days: {
          orderBy: { dayNumber: "asc" },
          include: { places: { orderBy: { orderIndex: "asc" }, include: { place: true } } },
        },
      },
    });

    const flatPlaces = trip.days.flatMap((day) =>
      day.places.map((tp) => ({ id: tp.placeId, latitude: tp.place.latitude, longitude: tp.place.longitude }))
    );

    const segments: RouteSegment[] = [];
    for (let i = 0; i < flatPlaces.length - 1; i++) {
      const origin = flatPlaces[i]!;
      const destination = flatPlaces[i + 1]!;
      const result = await this.provider.calculateRoute({
        origin: { latitude: origin.latitude, longitude: origin.longitude },
        destination: { latitude: destination.latitude, longitude: destination.longitude },
        profile: "driving",
      });
      segments.push({
        originPlaceId: origin.id,
        destinationPlaceId: destination.id,
        distanceMeters: result.distanceMeters,
        durationSeconds: result.durationSeconds,
        geometry: result.geometry,
      });
    }

    await prisma.$transaction([
      prisma.route.deleteMany({ where: { tripId } }),
      ...segments.map((seg, i) =>
        prisma.route.create({
          data: {
            tripId,
            originPlaceId: seg.originPlaceId,
            destinationPlaceId: seg.destinationPlaceId,
            orderIndex: i,
            distanceMeters: seg.distanceMeters,
            durationSeconds: seg.durationSeconds,
            geometry: seg.geometry as unknown as Prisma.InputJsonValue,
            provider: "google-directions",
          },
        })
      ),
    ]);

    return { segments, ...sumTotals(segments) };
  }

  async getTripRoute(tripId: string): Promise<TripRouteResult> {
    const routes = await prisma.route.findMany({ where: { tripId }, orderBy: { orderIndex: "asc" } });
    const segments: RouteSegment[] = routes.map((r) => ({
      originPlaceId: r.originPlaceId,
      destinationPlaceId: r.destinationPlaceId,
      distanceMeters: r.distanceMeters,
      durationSeconds: r.durationSeconds,
      geometry: r.geometry as unknown as LineStringGeometry,
    }));
    return { segments, ...sumTotals(segments) };
  }

  async getSegment(originPlaceId: string, destinationPlaceId: string): Promise<RouteSegment> {
    const [origin, destination] = await Promise.all([
      prisma.place.findUniqueOrThrow({ where: { id: originPlaceId } }),
      prisma.place.findUniqueOrThrow({ where: { id: destinationPlaceId } }),
    ]);
    const result = await this.provider.calculateRoute({
      origin: { latitude: origin.latitude, longitude: origin.longitude },
      destination: { latitude: destination.latitude, longitude: destination.longitude },
      profile: "driving",
    });
    return {
      originPlaceId,
      destinationPlaceId,
      distanceMeters: result.distanceMeters,
      durationSeconds: result.durationSeconds,
      geometry: result.geometry,
    };
  }
}

export const routeService: RouteService = new PrismaRouteService(googleRoutingProvider);
