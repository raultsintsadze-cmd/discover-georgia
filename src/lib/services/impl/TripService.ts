import "server-only";
import { prisma } from "@/lib/db/client";
import { Prisma } from "@prisma/client";
import type {
  TripService,
  TripDTO,
  TripDayDTO,
  CreateTripInput,
  UpdateTripInput,
  TripSummary,
  TripAdminSummary,
} from "../trip.service";
import { routeService } from "./RouteService";
import { pricingService } from "./PricingService";
import { analyticsProvider } from "@/lib/providers/analytics/console";

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function dayCount(startDate: Date, endDate: Date): number {
  return Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY) + 1;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * MS_PER_DAY);
}

type TripWithDays = Prisma.TripGetPayload<{
  include: { days: { include: { places: { include: { place: true } } } } };
}>;

function toDTO(trip: TripWithDays): TripDTO {
  return {
    id: trip.id,
    name: trip.name,
    startDate: trip.startDate,
    endDate: trip.endDate,
    travelers: trip.travelers,
    budget: trip.budget ? Number(trip.budget) : null,
    status: trip.status,
    preferredDriverId: trip.preferredDriverId,
    preferences: (trip.preferences as Record<string, unknown> | null) ?? null,
    days: trip.days
      .sort((a, b) => a.dayNumber - b.dayNumber)
      .map(
        (day): TripDayDTO => ({
          id: day.id,
          dayNumber: day.dayNumber,
          date: day.date,
          places: day.places
            .sort((a, b) => a.orderIndex - b.orderIndex)
            .map((tp) => ({
              tripPlaceId: tp.id,
              placeId: tp.placeId,
              placeName: tp.place.name,
              placeSlug: tp.place.slug,
              orderIndex: tp.orderIndex,
            })),
        })
      ),
  };
}

const TRIP_INCLUDE = {
  days: { include: { places: { include: { place: true } } } },
} satisfies Prisma.TripInclude;

/**
 * Prisma-backed TripService. Days are always derived from the trip's date
 * range (never managed as a separate CRUD primitive) — see
 * CreateTripInput's comment and docs/database.md.
 */
export class PrismaTripService implements TripService {
  async listTrips(userId: string): Promise<TripDTO[]> {
    const trips = await prisma.trip.findMany({
      where: { userId },
      include: TRIP_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return trips.map(toDTO);
  }

  async createTrip(userId: string, input: CreateTripInput): Promise<TripDTO> {
    if (input.endDate < input.startDate) {
      throw new Error("End date must be on or after the start date");
    }
    const days = dayCount(input.startDate, input.endDate);

    const trip = await prisma.trip.create({
      data: {
        userId,
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        travelers: input.travelers ?? 1,
        budget: input.budget,
        startLocation: input.startLocation,
        endLocation: input.endLocation,
        days: {
          create: Array.from({ length: days }, (_, i) => ({
            dayNumber: i + 1,
            date: addDays(input.startDate, i),
          })),
        },
      },
      include: TRIP_INCLUDE,
    });
    analyticsProvider.track({ name: "trip_created", tripId: trip.id, userId });
    return toDTO(trip);
  }

  async getTrip(tripId: string, userId: string): Promise<TripDTO | null> {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
      include: TRIP_INCLUDE,
    });
    return trip ? toDTO(trip) : null;
  }

  async updateTrip(tripId: string, userId: string, input: UpdateTripInput): Promise<TripDTO> {
    const existing = await prisma.trip.findFirst({ where: { id: tripId, userId }, include: TRIP_INCLUDE });
    if (!existing) {
      throw new Error("Trip not found");
    }

    const datesChanging = input.startDate !== undefined || input.endDate !== undefined;
    if (datesChanging) {
      if (!input.startDate || !input.endDate) {
        throw new Error("Both startDate and endDate must be provided together when changing dates");
      }
      if (input.endDate < input.startDate) {
        throw new Error("End date must be on or after the start date");
      }

      const newDayCount = dayCount(input.startDate, input.endDate);
      const existingDays = [...existing.days].sort((a, b) => a.dayNumber - b.dayNumber);

      if (newDayCount < existingDays.length) {
        const daysBeingCut = existingDays.slice(newDayCount);
        const hasPlaces = daysBeingCut.some((d) => d.places.length > 0);
        if (hasPlaces) {
          throw new Error("Remove places from the days you're cutting before shortening the trip");
        }
        await prisma.tripDay.deleteMany({ where: { id: { in: daysBeingCut.map((d) => d.id) } } });
      }

      await prisma.$transaction([
        ...existingDays.slice(0, newDayCount).map((day) =>
          prisma.tripDay.update({
            where: { id: day.id },
            data: { date: addDays(input.startDate!, day.dayNumber - 1) },
          })
        ),
        ...(newDayCount > existingDays.length
          ? [
              prisma.trip.update({
                where: { id: tripId },
                data: {
                  days: {
                    create: Array.from({ length: newDayCount - existingDays.length }, (_, i) => ({
                      dayNumber: existingDays.length + i + 1,
                      date: addDays(input.startDate!, existingDays.length + i),
                    })),
                  },
                },
              }),
            ]
          : []),
      ]);
    }

    if (input.preferredDriverId) {
      const driver = await prisma.driver.findUnique({ where: { id: input.preferredDriverId }, select: { id: true } });
      if (!driver) {
        throw new Error("Driver not found");
      }
    }

    const trip = await prisma.trip.update({
      where: { id: tripId },
      data: {
        name: input.name,
        startDate: input.startDate,
        endDate: input.endDate,
        travelers: input.travelers,
        budget: input.budget,
        startLocation: input.startLocation,
        endLocation: input.endLocation,
        preferences: input.preferences as Prisma.InputJsonValue | undefined,
        preferredDriverId: input.preferredDriverId,
      },
      include: TRIP_INCLUDE,
    });
    return toDTO(trip);
  }

  async deleteTrip(tripId: string, userId: string): Promise<void> {
    const existing = await prisma.trip.findFirst({ where: { id: tripId, userId }, select: { id: true } });
    if (!existing) {
      throw new Error("Trip not found");
    }
    await prisma.trip.delete({ where: { id: tripId } });
  }

  async addPlace(tripId: string, userId: string, dayNumber: number, placeId: string): Promise<TripDTO> {
    const trip = await prisma.trip.findFirst({ where: { id: tripId, userId }, include: TRIP_INCLUDE });
    if (!trip) {
      throw new Error("Trip not found");
    }
    const day = trip.days.find((d) => d.dayNumber === dayNumber);
    if (!day) {
      throw new Error(`Trip has no day ${dayNumber}`);
    }
    const alreadyAdded = day.places.some((p) => p.placeId === placeId);
    if (!alreadyAdded) {
      // Validated explicitly (rather than letting the FK constraint reject
      // it) so a bad id — e.g. one an AI tool call invented instead of
      // getting from search_places — fails with a clear message, not a
      // raw Postgres constraint error surfaced to the model/user.
      const place = await prisma.place.findUnique({ where: { id: placeId }, select: { id: true } });
      if (!place) {
        throw new Error("Place not found");
      }
      const nextOrderIndex = day.places.length === 0 ? 0 : Math.max(...day.places.map((p) => p.orderIndex)) + 1;
      await prisma.tripPlace.create({ data: { tripDayId: day.id, placeId, orderIndex: nextOrderIndex } });
      // Composition changed — any cached Route rows no longer match the itinerary.
      await prisma.route.deleteMany({ where: { tripId } });
    }

    const updated = await prisma.trip.findUniqueOrThrow({ where: { id: tripId }, include: TRIP_INCLUDE });
    return toDTO(updated);
  }

  async removePlace(tripId: string, userId: string, tripPlaceId: string): Promise<TripDTO> {
    const trip = await prisma.trip.findFirst({ where: { id: tripId, userId }, include: TRIP_INCLUDE });
    if (!trip) {
      throw new Error("Trip not found");
    }
    const day = trip.days.find((d) => d.places.some((p) => p.id === tripPlaceId));
    if (!day) {
      throw new Error("Place not found on this trip");
    }

    await prisma.tripPlace.delete({ where: { id: tripPlaceId } });

    // Compact orderIndex so later reorders/inserts don't have to reason about gaps.
    const remaining = day.places.filter((p) => p.id !== tripPlaceId).sort((a, b) => a.orderIndex - b.orderIndex);
    await prisma.$transaction(
      remaining.map((p, i) => prisma.tripPlace.update({ where: { id: p.id }, data: { orderIndex: i } }))
    );
    // Composition changed — any cached Route rows no longer match the itinerary.
    await prisma.route.deleteMany({ where: { tripId } });

    const updated = await prisma.trip.findUniqueOrThrow({ where: { id: tripId }, include: TRIP_INCLUDE });
    return toDTO(updated);
  }

  async reorderPlaces(
    tripId: string,
    userId: string,
    dayNumber: number,
    orderedTripPlaceIds: string[]
  ): Promise<TripDTO> {
    const trip = await prisma.trip.findFirst({ where: { id: tripId, userId }, include: TRIP_INCLUDE });
    if (!trip) {
      throw new Error("Trip not found");
    }
    const day = trip.days.find((d) => d.dayNumber === dayNumber);
    if (!day) {
      throw new Error(`Trip has no day ${dayNumber}`);
    }

    const currentIds = new Set(day.places.map((p) => p.id));
    const givenIds = new Set(orderedTripPlaceIds);
    const matches = currentIds.size === givenIds.size && [...currentIds].every((id) => givenIds.has(id));
    if (!matches) {
      throw new Error("Reorder list must contain exactly the places currently on this day");
    }

    await prisma.$transaction(
      orderedTripPlaceIds.map((id, i) => prisma.tripPlace.update({ where: { id }, data: { orderIndex: i } }))
    );
    // Order changed — any cached Route rows no longer match the itinerary.
    await prisma.route.deleteMany({ where: { tripId } });

    const updated = await prisma.trip.findUniqueOrThrow({ where: { id: tripId }, include: TRIP_INCLUDE });
    return toDTO(updated);
  }

  async getSummary(tripId: string, userId: string): Promise<TripSummary> {
    const trip = await prisma.trip.findFirst({
      where: { id: tripId, userId },
      select: { id: true, days: { select: { _count: { select: { places: true } } } } },
    });
    if (!trip) {
      throw new Error("Trip not found");
    }

    // Composes RouteService + PricingService output — never queries Route
    // rows or computes distance/cost itself (see docs/architecture.md §8).
    const route = await routeService.getTripRoute(tripId);
    const routeComputed = route.segments.length > 0;

    if (!routeComputed) {
      return { routeComputed: false, totalDistanceMeters: 0, totalDrivingSeconds: 0, estimatedTransportCostGel: 0 };
    }

    // A driver is only needed on days with at least one place.
    const activeDays = trip.days.filter((d) => d._count.places > 0).length;
    const estimate = await pricingService.estimateTransportCost({
      distanceMeters: route.totalDistanceMeters,
      tripDays: activeDays,
    });

    return {
      routeComputed: true,
      totalDistanceMeters: route.totalDistanceMeters,
      totalDrivingSeconds: route.totalDurationSeconds,
      estimatedTransportCostGel: estimate.total.amount / 100,
    };
  }

  async adminList(): Promise<TripAdminSummary[]> {
    const trips = await prisma.trip.findMany({
      include: { user: { select: { email: true } }, days: { select: { _count: { select: { places: true } } } } },
      orderBy: { createdAt: "desc" },
    });
    return trips.map((t) => ({
      id: t.id,
      name: t.name,
      ownerEmail: t.user.email,
      status: t.status,
      startDate: t.startDate,
      endDate: t.endDate,
      placeCount: t.days.reduce((sum, d) => sum + d._count.places, 0),
      createdAt: t.createdAt,
    }));
  }
}

export const tripService: TripService = new PrismaTripService();
