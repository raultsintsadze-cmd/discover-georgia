import "server-only";
import { prisma } from "@/lib/db/client";
import { DriverVerificationStatus, DriverAvailabilityStatus, type Prisma } from "@prisma/client";
import type { DriverService, DriverSummary, DriverSearchFilters } from "../driver.service";

type DriverRow = Prisma.DriverGetPayload<{ include: { regions: { include: { region: true } } } }>;

function toDTO(driver: DriverRow): DriverSummary {
  return {
    id: driver.id,
    name: driver.name,
    photoUrl: driver.photoUrl,
    rating: driver.rating ? driver.rating.toNumber() : null,
    vehicle: driver.vehicle,
    languages: driver.languages,
    tripsCompleted: driver.tripsCompleted,
    regions: driver.regions.map((r) => r.region.name),
    pricePerKm: driver.pricePerKm ? driver.pricePerKm.toNumber() : null,
    dailyRate: driver.dailyRate ? driver.dailyRate.toNumber() : null,
    minimumTripPrice: driver.minimumTripPrice ? driver.minimumTripPrice.toNumber() : null,
    verificationStatus: driver.verificationStatus,
    availabilityStatus: driver.availabilityStatus,
  };
}

const DRIVER_INCLUDE = { regions: { include: { region: true } } } satisfies Prisma.DriverInclude;

export class PrismaDriverService implements DriverService {
  async listAvailable(filters: DriverSearchFilters): Promise<DriverSummary[]> {
    const drivers = await prisma.driver.findMany({
      where: {
        verificationStatus: DriverVerificationStatus.VERIFIED,
        availabilityStatus: DriverAvailabilityStatus.AVAILABLE,
        ...(filters.minSeats ? { seats: { gte: filters.minSeats } } : {}),
        ...(filters.languages?.length ? { languages: { hasSome: filters.languages } } : {}),
        ...(filters.regionSlug ? { regions: { some: { region: { slug: filters.regionSlug } } } } : {}),
      },
      include: DRIVER_INCLUDE,
      orderBy: { rating: "desc" },
    });
    return drivers.map(toDTO);
  }

  async getById(driverId: string): Promise<DriverSummary | null> {
    const driver = await prisma.driver.findUnique({ where: { id: driverId }, include: DRIVER_INCLUDE });
    return driver ? toDTO(driver) : null;
  }

  async verify(driverId: string, adminUserId: string): Promise<void> {
    await prisma.driver.update({
      where: { id: driverId },
      data: { verificationStatus: DriverVerificationStatus.VERIFIED, reviewedByAdminId: adminUserId },
    });
  }

  async suspend(driverId: string, adminUserId: string, reason: string): Promise<void> {
    await prisma.driver.update({
      where: { id: driverId },
      data: { verificationStatus: DriverVerificationStatus.SUSPENDED, reviewedByAdminId: adminUserId, reviewNotes: reason },
    });
  }

  async setAvailability(driverId: string, status: "AVAILABLE" | "UNAVAILABLE"): Promise<void> {
    await prisma.driver.update({ where: { id: driverId }, data: { availabilityStatus: status } });
  }

  async listAll(): Promise<DriverSummary[]> {
    const drivers = await prisma.driver.findMany({
      include: DRIVER_INCLUDE,
      orderBy: { createdAt: "desc" },
    });
    return drivers.map(toDTO);
  }
}

export const driverService: DriverService = new PrismaDriverService();
