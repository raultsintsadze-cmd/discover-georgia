import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";
import type {
  RestaurantService,
  RestaurantDTO,
  RestaurantSearchFilters,
  RestaurantAdminInput,
} from "../restaurant.service";

type RestaurantRow = Prisma.RestaurantGetPayload<object>;

function toDTO(restaurant: RestaurantRow): RestaurantDTO {
  return {
    id: restaurant.id,
    name: restaurant.name,
    description: restaurant.description,
    cuisine: restaurant.cuisine,
    rating: restaurant.rating ? restaurant.rating.toNumber() : null,
    priceLevel: restaurant.priceLevel,
    bookingUrl: restaurant.bookingUrl,
  };
}

export class PrismaRestaurantService implements RestaurantService {
  async listNearPlace(placeId: string): Promise<RestaurantDTO[]> {
    const restaurants = await prisma.restaurant.findMany({
      where: { nearPlaceId: placeId },
      orderBy: { rating: "desc" },
    });
    return restaurants.map(toDTO);
  }

  async search(filters: RestaurantSearchFilters): Promise<RestaurantDTO[]> {
    const restaurants = await prisma.restaurant.findMany({
      where: {
        ...(filters.regionSlug ? { nearPlace: { region: { slug: filters.regionSlug } } } : {}),
        ...(filters.cuisine ? { cuisine: filters.cuisine } : {}),
        ...(filters.maxPriceLevel ? { priceLevel: { lte: filters.maxPriceLevel } } : {}),
      },
      orderBy: { rating: "desc" },
    });
    return restaurants.map(toDTO);
  }

  async adminList(): Promise<RestaurantDTO[]> {
    const restaurants = await prisma.restaurant.findMany({ orderBy: { createdAt: "desc" } });
    return restaurants.map(toDTO);
  }

  async createRestaurant(input: RestaurantAdminInput): Promise<{ restaurantId: string }> {
    const place = await prisma.place.findUniqueOrThrow({ where: { id: input.nearPlaceId } });
    const restaurant = await prisma.restaurant.create({
      data: {
        name: input.name,
        nearPlaceId: place.id,
        latitude: place.latitude,
        longitude: place.longitude,
        cuisine: input.cuisine,
        description: input.description,
        rating: input.rating,
        priceLevel: input.priceLevel,
        bookingUrl: input.bookingUrl,
      },
    });
    return { restaurantId: restaurant.id };
  }

  async updateRestaurant(restaurantId: string, input: Partial<RestaurantAdminInput>): Promise<void> {
    const place = input.nearPlaceId ? await prisma.place.findUniqueOrThrow({ where: { id: input.nearPlaceId } }) : null;
    await prisma.restaurant.update({
      where: { id: restaurantId },
      data: {
        name: input.name,
        nearPlaceId: place?.id,
        latitude: place?.latitude,
        longitude: place?.longitude,
        cuisine: input.cuisine,
        description: input.description,
        rating: input.rating,
        priceLevel: input.priceLevel,
        bookingUrl: input.bookingUrl,
      },
    });
  }

  async deleteRestaurant(restaurantId: string): Promise<void> {
    await prisma.restaurant.delete({ where: { id: restaurantId } });
  }
}

export const restaurantService: RestaurantService = new PrismaRestaurantService();
