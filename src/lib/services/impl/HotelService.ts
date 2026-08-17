import "server-only";
import { prisma } from "@/lib/db/client";
import type { Prisma } from "@prisma/client";
import type { HotelService, HotelDTO, HotelSearchFilters, HotelAdminInput } from "../hotel.service";

type HotelRow = Prisma.HotelGetPayload<object>;

function toDTO(hotel: HotelRow): HotelDTO {
  return {
    id: hotel.id,
    name: hotel.name,
    description: hotel.description,
    rating: hotel.rating ? hotel.rating.toNumber() : null,
    price: hotel.price ? hotel.price.toNumber() : null,
    bookingUrl: hotel.bookingUrl,
    category: hotel.category,
  };
}

export class PrismaHotelService implements HotelService {
  async listNearPlace(placeId: string): Promise<HotelDTO[]> {
    const hotels = await prisma.hotel.findMany({ where: { nearPlaceId: placeId }, orderBy: { rating: "desc" } });
    return hotels.map(toDTO);
  }

  async search(filters: HotelSearchFilters): Promise<HotelDTO[]> {
    const hotels = await prisma.hotel.findMany({
      where: {
        ...(filters.regionSlug ? { region: { slug: filters.regionSlug } } : {}),
        ...(filters.maxPrice ? { price: { lte: filters.maxPrice } } : {}),
        ...(filters.minRating ? { rating: { gte: filters.minRating } } : {}),
      },
      orderBy: { rating: "desc" },
    });
    return hotels.map(toDTO);
  }

  async adminList(): Promise<HotelDTO[]> {
    const hotels = await prisma.hotel.findMany({ orderBy: { createdAt: "desc" } });
    return hotels.map(toDTO);
  }

  async createHotel(input: HotelAdminInput): Promise<{ hotelId: string }> {
    const place = await prisma.place.findUniqueOrThrow({ where: { id: input.nearPlaceId } });
    const hotel = await prisma.hotel.create({
      data: {
        name: input.name,
        nearPlaceId: place.id,
        regionId: place.regionId,
        latitude: place.latitude,
        longitude: place.longitude,
        description: input.description,
        category: input.category,
        rating: input.rating,
        price: input.price,
        bookingUrl: input.bookingUrl,
      },
    });
    return { hotelId: hotel.id };
  }

  async updateHotel(hotelId: string, input: Partial<HotelAdminInput>): Promise<void> {
    const place = input.nearPlaceId ? await prisma.place.findUniqueOrThrow({ where: { id: input.nearPlaceId } }) : null;
    await prisma.hotel.update({
      where: { id: hotelId },
      data: {
        name: input.name,
        nearPlaceId: place?.id,
        regionId: place?.regionId,
        latitude: place?.latitude,
        longitude: place?.longitude,
        description: input.description,
        category: input.category,
        rating: input.rating,
        price: input.price,
        bookingUrl: input.bookingUrl,
      },
    });
  }

  async deleteHotel(hotelId: string): Promise<void> {
    await prisma.hotel.delete({ where: { id: hotelId } });
  }
}

export const hotelService: HotelService = new PrismaHotelService();
