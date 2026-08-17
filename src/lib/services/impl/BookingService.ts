import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma, TripRequest } from "@prisma/client";
import type {
  BookingService,
  CreateTripRequestInput,
  TripRequestDTO,
  TripRequestStatus,
} from "../booking.service";
import { tripService } from "./TripService";
import { routeService } from "./RouteService";
import { pricingService } from "./PricingService";
import { driverService } from "./DriverService";
import { telegramService } from "./TelegramService";
import { formatDateRange } from "@/lib/utils/format";
import { analyticsProvider } from "@/lib/providers/analytics/console";

function toDTO(row: TripRequest): TripRequestDTO {
  return {
    id: row.id,
    tripId: row.tripId,
    userId: row.userId,
    driverId: row.driverId,
    distanceMeters: row.distanceMeters,
    durationSeconds: row.durationSeconds,
    estimatedPriceGel: row.estimatedPrice.toNumber(),
    passengers: row.passengers,
    startDate: row.startDate,
    endDate: row.endDate,
    notes: row.notes,
    status: row.status,
    createdAt: row.createdAt,
  };
}

// Only PENDING has a non-admin-reachable exit — everything past that is
// admin/dispatcher-driven (Phase 11 "Trips" section will call updateStatus
// directly; no route exposes it to non-admins yet).
const VALID_TRANSITIONS: Record<TripRequestStatus, TripRequestStatus[]> = {
  PENDING: ["DRIVER_ACCEPTED", "CANCELLED"],
  DRIVER_ACCEPTED: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export class PrismaBookingService implements BookingService {
  async createTripRequest(userId: string, input: CreateTripRequestInput): Promise<TripRequestDTO> {
    if (input.idempotencyKey) {
      const existing = await prisma.tripRequest.findUnique({
        where: { userId_idempotencyKey: { userId, idempotencyKey: input.idempotencyKey } },
      });
      if (existing) return toDTO(existing);
    }

    const trip = await tripService.getTrip(input.tripId, userId);
    if (!trip) {
      throw new Error("Trip not found");
    }

    // Never fabricate distance/duration/price — force a real calculation
    // if the cache is empty (e.g. invalidated by a recent edit), same as
    // Trip Score's ensureTripRoute.
    let route = await routeService.getTripRoute(input.tripId);
    if (route.segments.length === 0) {
      route = await routeService.calculateTripRoute(input.tripId);
    }
    if (route.segments.length === 0) {
      throw new Error("This trip has no places yet — add places before requesting it");
    }

    const activeDays = trip.days.filter((d) => d.places.length > 0).length;
    const estimate = await pricingService.estimateTransportCost({
      distanceMeters: route.totalDistanceMeters,
      tripDays: activeDays,
    });

    const driverId = input.driverId ?? trip.preferredDriverId ?? undefined;
    const driver = driverId ? await driverService.getById(driverId) : null;
    if (driverId && !driver) {
      throw new Error("Driver not found");
    }

    const itinerarySnapshot = {
      tripName: trip.name,
      startDate: trip.startDate?.toISOString() ?? null,
      endDate: trip.endDate?.toISOString() ?? null,
      travelers: trip.travelers,
      days: trip.days.map((d) => ({
        dayNumber: d.dayNumber,
        date: d.date?.toISOString() ?? null,
        places: d.places.map((p) => ({ placeId: p.placeId, name: p.placeName, orderIndex: p.orderIndex })),
      })),
      route: { totalDistanceMeters: route.totalDistanceMeters, totalDurationSeconds: route.totalDurationSeconds },
    };

    const created = await prisma.tripRequest.create({
      data: {
        tripId: input.tripId,
        userId,
        driverId,
        itinerarySnapshot: itinerarySnapshot as Prisma.InputJsonValue,
        distanceMeters: route.totalDistanceMeters,
        durationSeconds: route.totalDurationSeconds,
        estimatedPrice: estimate.total.amount / 100,
        passengers: input.passengers,
        startDate: trip.startDate,
        endDate: trip.endDate,
        notes: input.notes,
        idempotencyKey: input.idempotencyKey,
      },
    });

    const dto = toDTO(created);
    // Best-effort — TelegramService already records/absorbs its own
    // failures, this is just an extra guard so a booking can never fail
    // because of a notification-layer bug.
    try {
      const user = await prisma.user.findUnique({ where: { id: userId }, select: { name: true, email: true } });
      const context = {
        customerName: user?.name ?? user?.email ?? "Customer",
        routeSummary: trip.days.flatMap((d) => d.places.map((p) => p.placeName)).join(" → ") || "No places",
        dateRange: formatDateRange(trip.startDate, trip.endDate),
        driverName: driver?.name ?? null,
      };
      await Promise.all([
        telegramService.notifyAdminNewTripRequest(dto, context),
        driverId ? telegramService.notifyDriverNewTripRequest(dto, context) : Promise.resolve(),
      ]);
    } catch {
      // Swallowed on purpose — see comment above.
    }

    analyticsProvider.track({ name: "driver_request_created", tripRequestId: dto.id, userId });

    return dto;
  }

  async updateStatus(tripRequestId: string, status: TripRequestStatus, actorUserId: string): Promise<TripRequestDTO> {
    const existing = await prisma.tripRequest.findUnique({ where: { id: tripRequestId } });
    if (!existing) {
      throw new Error("Trip request not found");
    }

    const allowed = VALID_TRANSITIONS[existing.status];
    if (!allowed.includes(status)) {
      throw new Error(`Cannot move a trip request from ${existing.status} to ${status}`);
    }

    const actor = await prisma.user.findUnique({ where: { id: actorUserId }, select: { role: true } });
    if (actor?.role !== "ADMIN") {
      if (existing.status !== "PENDING") {
        throw new Error("Not authorized: only the assigned driver can respond, and only while the request is pending");
      }
      const actingDriver = await prisma.driver.findUnique({ where: { userId: actorUserId }, select: { id: true } });
      if (!actingDriver || actingDriver.id !== existing.driverId) {
        throw new Error("Not authorized to update this trip request");
      }
    }

    const updated = await prisma.tripRequest.update({ where: { id: tripRequestId }, data: { status } });
    return toDTO(updated);
  }

  async getById(tripRequestId: string): Promise<TripRequestDTO | null> {
    const row = await prisma.tripRequest.findUnique({ where: { id: tripRequestId } });
    return row ? toDTO(row) : null;
  }

  async listForUser(userId: string): Promise<TripRequestDTO[]> {
    const rows = await prisma.tripRequest.findMany({ where: { userId }, orderBy: { createdAt: "desc" } });
    return rows.map(toDTO);
  }

  async listForDriver(driverId: string): Promise<TripRequestDTO[]> {
    const rows = await prisma.tripRequest.findMany({ where: { driverId }, orderBy: { createdAt: "desc" } });
    return rows.map(toDTO);
  }

  async adminList(): Promise<TripRequestDTO[]> {
    const rows = await prisma.tripRequest.findMany({ orderBy: { createdAt: "desc" } });
    return rows.map(toDTO);
  }
}

export const bookingService: BookingService = new PrismaBookingService();
