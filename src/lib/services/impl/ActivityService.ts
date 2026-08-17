import "server-only";
import { prisma } from "@/lib/db/client";
import { ActivityCategory, type Prisma } from "@prisma/client";
import type { ActivityService, ActivityDTO, ActivitySearchFilters, ActivityAdminInput } from "../activity.service";

type ActivityRow = Prisma.ActivityGetPayload<object>;

function toDTO(activity: ActivityRow): ActivityDTO {
  return {
    id: activity.id,
    name: activity.name,
    category: activity.category,
    description: activity.description,
    price: activity.price ? activity.price.toNumber() : null,
    rating: activity.rating ? activity.rating.toNumber() : null,
    bookingUrl: activity.bookingUrl,
  };
}

export class PrismaActivityService implements ActivityService {
  async listNearPlace(placeId: string): Promise<ActivityDTO[]> {
    const activities = await prisma.activity.findMany({ where: { nearPlaceId: placeId }, orderBy: { rating: "desc" } });
    return activities.map(toDTO);
  }

  async search(filters: ActivitySearchFilters): Promise<ActivityDTO[]> {
    const activities = await prisma.activity.findMany({
      where: {
        ...(filters.category ? { category: filters.category as ActivityCategory } : {}),
        ...(filters.regionSlug ? { nearPlace: { region: { slug: filters.regionSlug } } } : {}),
      },
      orderBy: { rating: "desc" },
    });
    return activities.map(toDTO);
  }

  async adminList(): Promise<ActivityDTO[]> {
    const activities = await prisma.activity.findMany({ orderBy: { createdAt: "desc" } });
    return activities.map(toDTO);
  }

  async createActivity(input: ActivityAdminInput): Promise<{ activityId: string }> {
    const place = await prisma.place.findUniqueOrThrow({ where: { id: input.nearPlaceId } });
    const activity = await prisma.activity.create({
      data: {
        name: input.name,
        nearPlaceId: place.id,
        category: input.category as ActivityCategory,
        latitude: place.latitude,
        longitude: place.longitude,
        description: input.description,
        rating: input.rating,
        price: input.price,
        bookingUrl: input.bookingUrl,
      },
    });
    return { activityId: activity.id };
  }

  async updateActivity(activityId: string, input: Partial<ActivityAdminInput>): Promise<void> {
    const place = input.nearPlaceId ? await prisma.place.findUniqueOrThrow({ where: { id: input.nearPlaceId } }) : null;
    await prisma.activity.update({
      where: { id: activityId },
      data: {
        name: input.name,
        nearPlaceId: place?.id,
        category: input.category as ActivityCategory | undefined,
        latitude: place?.latitude,
        longitude: place?.longitude,
        description: input.description,
        rating: input.rating,
        price: input.price,
        bookingUrl: input.bookingUrl,
      },
    });
  }

  async deleteActivity(activityId: string): Promise<void> {
    await prisma.activity.delete({ where: { id: activityId } });
  }
}

export const activityService: ActivityService = new PrismaActivityService();
