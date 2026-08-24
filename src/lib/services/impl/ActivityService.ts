import "server-only";
import { prisma } from "@/lib/db/client";
import { ActivityCategory, Prisma } from "@prisma/client";
import type {
  ActivityService,
  ActivityDTO,
  ActivityDetail,
  ActivitySearchFilters,
  ActivityAdminInput,
  ActivityInquiryInput,
} from "../activity.service";
import { slugify } from "@/lib/utils/slugify";
import { telegramService } from "./TelegramService";

const activityWithFeaturedVideo = Prisma.validator<Prisma.ActivityDefaultArgs>()({
  include: { featuredVideo: true },
});
type ActivityRow = Prisma.ActivityGetPayload<typeof activityWithFeaturedVideo>;

const activityWithPlace = Prisma.validator<Prisma.ActivityDefaultArgs>()({
  include: { featuredVideo: true, nearPlace: { include: { region: true } } },
});
type ActivityDetailRow = Prisma.ActivityGetPayload<typeof activityWithPlace>;

function toDTO(activity: ActivityRow): ActivityDTO {
  return {
    id: activity.id,
    slug: activity.slug,
    name: activity.name,
    category: activity.category,
    description: activity.description,
    price: activity.price ? activity.price.toNumber() : null,
    rating: activity.rating ? activity.rating.toNumber() : null,
    bookingUrl: activity.bookingUrl,
    featuredVideoPosterUrl: activity.featuredVideo?.posterUrl ?? null,
  };
}

function toDetail(activity: ActivityDetailRow): ActivityDetail {
  return {
    ...toDTO(activity),
    nearPlaceId: activity.nearPlace?.id ?? null,
    nearPlaceName: activity.nearPlace?.name ?? null,
    nearPlaceSlug: activity.nearPlace?.slug ?? null,
    regionName: activity.nearPlace?.region.name ?? null,
  };
}

export class PrismaActivityService implements ActivityService {
  async getBySlug(slug: string): Promise<ActivityDetail | null> {
    const activity = await prisma.activity.findUnique({ where: { slug }, ...activityWithPlace });
    return activity ? toDetail(activity) : null;
  }

  async listNearPlace(placeId: string): Promise<ActivityDTO[]> {
    const activities = await prisma.activity.findMany({
      where: { nearPlaceId: placeId },
      orderBy: { rating: "desc" },
      ...activityWithFeaturedVideo,
    });
    return activities.map(toDTO);
  }

  async search(filters: ActivitySearchFilters): Promise<ActivityDTO[]> {
    const activities = await prisma.activity.findMany({
      where: {
        ...(filters.category ? { category: filters.category as ActivityCategory } : {}),
        ...(filters.regionSlug ? { nearPlace: { region: { slug: filters.regionSlug } } } : {}),
      },
      orderBy: { rating: "desc" },
      ...activityWithFeaturedVideo,
    });
    return activities.map(toDTO);
  }

  async adminList(): Promise<ActivityDTO[]> {
    const activities = await prisma.activity.findMany({ orderBy: { createdAt: "desc" }, ...activityWithFeaturedVideo });
    return activities.map(toDTO);
  }

  async createActivity(input: ActivityAdminInput): Promise<{ activityId: string }> {
    const place = await prisma.place.findUniqueOrThrow({ where: { id: input.nearPlaceId } });

    const base = slugify(input.name);
    let slug = base;
    for (let n = 2; await prisma.activity.findUnique({ where: { slug }, select: { id: true } }); n++) {
      slug = `${base}-${n}`;
    }

    const activity = await prisma.activity.create({
      data: {
        name: input.name,
        slug,
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

  async submitInquiry(input: ActivityInquiryInput): Promise<{ inquiryId: string }> {
    const activity = await prisma.activity.findUniqueOrThrow({ where: { id: input.activityId }, select: { name: true } });

    const inquiry = await prisma.activityInquiry.create({
      data: {
        activityId: input.activityId,
        userId: input.userId,
        contactName: input.contactName,
        contactEmail: input.contactEmail,
        message: input.message,
      },
    });

    // Best-effort, same reasoning as BookingService.createTripRequest —
    // the inquiry must succeed even if the notification layer can't
    // reach Telegram; TelegramService already records/absorbs its own
    // delivery failures either way.
    try {
      await telegramService.notifyAdminActivityInquiry(
        {
          id: inquiry.id,
          activityId: inquiry.activityId,
          contactName: inquiry.contactName,
          contactEmail: inquiry.contactEmail,
          message: inquiry.message,
          status: inquiry.status,
          createdAt: inquiry.createdAt,
        },
        activity.name
      );
    } catch {
      // Swallowed on purpose — see comment above.
    }

    return { inquiryId: inquiry.id };
  }
}

export const activityService: ActivityService = new PrismaActivityService();
