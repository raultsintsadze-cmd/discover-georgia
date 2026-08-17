import "server-only";
import { prisma } from "@/lib/db/client";
import { Prisma, PlaceStatus } from "@prisma/client";
import type {
  PlaceService,
  PlaceSearchFilters,
  PlaceSummary,
  PlaceWithDistance,
  PlaceDetail,
  PlaceAdminInput,
  PlaceAdminSummary,
} from "../place.service";
import type { LatLng } from "@/lib/types/domain";
import { analyticsProvider } from "@/lib/providers/analytics/console";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";
import { localize } from "@/lib/utils/localize";

const DEFAULT_PAGE_SIZE = 20;
const NEARBY_ON_DETAIL_LIMIT = 6;
const NEARBY_ON_DETAIL_RADIUS_KM = 50;

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Row shape returned by the raw PostGIS queries below (see docs/database.md §2). */
interface PlaceRow {
  id: string;
  slug: string;
  name: string;
  nameKa: string | null;
  nameRu: string | null;
  shortDescription: string;
  shortDescriptionKa: string | null;
  shortDescriptionRu: string | null;
  latitude: number;
  longitude: number;
  regionName: string;
  categoryName: string;
  featuredVideoPosterUrl: string | null;
  distanceMeters: number;
}

function toSummary(row: PlaceRow, locale: Locale): PlaceSummary {
  return {
    id: row.id,
    slug: row.slug,
    name: localize(row.name, row.nameKa, row.nameRu, locale),
    shortDescription: localize(row.shortDescription, row.shortDescriptionKa, row.shortDescriptionRu, locale),
    regionName: row.regionName,
    categoryName: row.categoryName,
    featuredVideoPosterUrl: row.featuredVideoPosterUrl,
    location: { latitude: row.latitude, longitude: row.longitude },
  };
}

function toWithDistance(row: PlaceRow, locale: Locale): PlaceWithDistance {
  return { ...toSummary(row, locale), distanceMeters: Math.round(row.distanceMeters) };
}

/**
 * Prisma + PostGIS-backed PlaceService. `getNearby` is the only method
 * that drops to raw SQL — Prisma's query builder has no geography
 * operators, so ST_DWithin/ST_Distance are issued via a parameterized
 * $queryRaw tagged template (safe from injection; values are bound, not
 * string-interpolated).
 */
export class PrismaPlaceService implements PlaceService {
  async getBySlug(slug: string, locale: Locale = DEFAULT_LOCALE): Promise<PlaceDetail | null> {
    const place = await prisma.place.findUnique({
      where: { slug },
      include: { region: true, category: true, featuredVideo: true },
    });
    return this.toDetail(place, locale);
  }

  async getById(id: string, locale: Locale = DEFAULT_LOCALE): Promise<PlaceDetail | null> {
    const place = await prisma.place.findUnique({
      where: { id },
      include: { region: true, category: true, featuredVideo: true },
    });
    return this.toDetail(place, locale);
  }

  private async toDetail(
    place:
      | (Prisma.PlaceGetPayload<{ include: { region: true; category: true; featuredVideo: true } }>)
      | null,
    locale: Locale
  ): Promise<PlaceDetail | null> {
    if (!place || place.status !== PlaceStatus.PUBLISHED) return null;

    // Fetch one extra so excluding the place itself still leaves a full page.
    const nearby = await this.getNearby(
      { latitude: place.latitude, longitude: place.longitude },
      NEARBY_ON_DETAIL_RADIUS_KM,
      NEARBY_ON_DETAIL_LIMIT + 1,
      locale
    );

    return {
      id: place.id,
      slug: place.slug,
      name: localize(place.name, place.nameKa, place.nameRu, locale),
      shortDescription: localize(place.shortDescription, place.shortDescriptionKa, place.shortDescriptionRu, locale),
      description: localize(place.description, place.descriptionKa, place.descriptionRu, locale),
      regionName: place.region.name,
      categoryName: place.category.name,
      featuredVideoPosterUrl: place.featuredVideo?.posterUrl ?? null,
      location: { latitude: place.latitude, longitude: place.longitude },
      bestSeason: place.bestSeason,
      recommendedDuration: place.recommendedDuration,
      difficulty: place.difficulty,
      entranceFee: place.entranceFee,
      parking: place.parking,
      familyFriendly: place.familyFriendly,
      tags: place.tags,
      nearbyPlaceIds: nearby
        .filter((n) => n.id !== place.id)
        .slice(0, NEARBY_ON_DETAIL_LIMIT)
        .map((n) => n.id),
    };
  }

  async search(filters: PlaceSearchFilters, locale: Locale = DEFAULT_LOCALE): Promise<PlaceSummary[]> {
    const page = filters.page && filters.page > 0 ? filters.page : 1;
    const pageSize = filters.pageSize && filters.pageSize > 0 ? filters.pageSize : DEFAULT_PAGE_SIZE;

    const where: Prisma.PlaceWhereInput = {
      status: PlaceStatus.PUBLISHED,
      ...(filters.regionSlug ? { region: { slug: filters.regionSlug } } : {}),
      ...(filters.categorySlug ? { category: { slug: filters.categorySlug } } : {}),
      ...(filters.tags && filters.tags.length > 0 ? { tags: { hasSome: filters.tags } } : {}),
      ...(filters.query
        ? {
            OR: [
              { name: { contains: filters.query, mode: "insensitive" } },
              { shortDescription: { contains: filters.query, mode: "insensitive" } },
              { tags: { has: filters.query.toLowerCase() } },
            ],
          }
        : {}),
    };

    const places = await prisma.place.findMany({
      where,
      include: { region: true, category: true, featuredVideo: true },
      orderBy: { name: "asc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return places.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: localize(p.name, p.nameKa, p.nameRu, locale),
      shortDescription: localize(p.shortDescription, p.shortDescriptionKa, p.shortDescriptionRu, locale),
      regionName: p.region.name,
      categoryName: p.category.name,
      featuredVideoPosterUrl: p.featuredVideo?.posterUrl ?? null,
      location: { latitude: p.latitude, longitude: p.longitude },
    }));
  }

  async getNearby(point: LatLng, radiusKm: number, limit = 20, locale: Locale = DEFAULT_LOCALE): Promise<PlaceWithDistance[]> {
    const radiusMeters = radiusKm * 1000;
    const rows = await prisma.$queryRaw<PlaceRow[]>`
      SELECT
        p.id, p.slug, p.name, p."nameKa", p."nameRu",
        p."shortDescription", p."shortDescriptionKa", p."shortDescriptionRu",
        p.latitude, p.longitude,
        r.name AS "regionName", c.name AS "categoryName",
        v."posterUrl" AS "featuredVideoPosterUrl",
        ST_Distance(p.location, ST_SetSRID(ST_MakePoint(${point.longitude}, ${point.latitude}), 4326)::geography) AS "distanceMeters"
      FROM "Place" p
      JOIN "Region" r ON r.id = p."regionId"
      JOIN "Category" c ON c.id = p."categoryId"
      LEFT JOIN "Video" v ON v.id = p."featuredVideoId"
      WHERE p.status = 'PUBLISHED'
        AND ST_DWithin(p.location, ST_SetSRID(ST_MakePoint(${point.longitude}, ${point.latitude}), 4326)::geography, ${radiusMeters})
      ORDER BY "distanceMeters" ASC
      LIMIT ${limit}
    `;
    return rows.map((row) => toWithDistance(row, locale));
  }

  async listByRegion(regionSlug: string, locale: Locale = DEFAULT_LOCALE): Promise<PlaceSummary[]> {
    return this.search({ regionSlug, pageSize: 100 }, locale);
  }

  async getManyByIds(ids: string[], locale: Locale = DEFAULT_LOCALE): Promise<PlaceSummary[]> {
    if (ids.length === 0) return [];
    const places = await prisma.place.findMany({
      where: { id: { in: ids }, status: PlaceStatus.PUBLISHED },
      include: { region: true, category: true, featuredVideo: true },
    });
    const byId = new Map(places.map((p) => [p.id, p]));
    return ids.flatMap((id) => {
      const p = byId.get(id);
      if (!p) return [];
      return [
        {
          id: p.id,
          slug: p.slug,
          name: localize(p.name, p.nameKa, p.nameRu, locale),
          shortDescription: localize(p.shortDescription, p.shortDescriptionKa, p.shortDescriptionRu, locale),
          regionName: p.region.name,
          categoryName: p.category.name,
          featuredVideoPosterUrl: p.featuredVideo?.posterUrl ?? null,
          location: { latitude: p.latitude, longitude: p.longitude },
        },
      ];
    });
  }

  async listByCategory(categorySlug: string, locale: Locale = DEFAULT_LOCALE): Promise<PlaceSummary[]> {
    return this.search({ categorySlug, pageSize: 100 }, locale);
  }

  async incrementView(placeId: string): Promise<void> {
    await prisma.place.update({ where: { id: placeId }, data: { viewCount: { increment: 1 } } });
    analyticsProvider.track({ name: "place_view", placeId });
  }

  async adminList(): Promise<PlaceAdminSummary[]> {
    const places = await prisma.place.findMany({
      include: { region: true, category: true, featuredVideo: true },
      orderBy: { updatedAt: "desc" },
    });
    return places.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDescription,
      regionName: p.region.name,
      categoryName: p.category.name,
      featuredVideoPosterUrl: p.featuredVideo?.posterUrl ?? null,
      location: { latitude: p.latitude, longitude: p.longitude },
      status: p.status,
    }));
  }

  async createPlace(input: PlaceAdminInput): Promise<{ placeId: string }> {
    const region = await prisma.region.findUniqueOrThrow({ where: { slug: input.regionSlug } });
    const category = await prisma.category.findUniqueOrThrow({ where: { slug: input.categorySlug } });

    const base = slugify(input.name);
    let slug = base;
    for (let n = 2; await prisma.place.findUnique({ where: { slug }, select: { id: true } }); n++) {
      slug = `${base}-${n}`;
    }

    const place = await prisma.place.create({
      data: {
        name: input.name,
        slug,
        shortDescription: input.shortDescription,
        description: input.description,
        regionId: region.id,
        categoryId: category.id,
        latitude: input.latitude,
        longitude: input.longitude,
        bestSeason: input.bestSeason,
        recommendedDuration: input.recommendedDuration,
        difficulty: input.difficulty,
        entranceFee: input.entranceFee,
        parking: input.parking ?? false,
        familyFriendly: input.familyFriendly ?? false,
        tags: input.tags ?? [],
        status: input.status ?? PlaceStatus.DRAFT,
      },
    });
    return { placeId: place.id };
  }

  async updatePlace(placeId: string, input: Partial<PlaceAdminInput>): Promise<void> {
    const region = input.regionSlug
      ? await prisma.region.findUniqueOrThrow({ where: { slug: input.regionSlug } })
      : null;
    const category = input.categorySlug
      ? await prisma.category.findUniqueOrThrow({ where: { slug: input.categorySlug } })
      : null;

    await prisma.place.update({
      where: { id: placeId },
      data: {
        name: input.name,
        shortDescription: input.shortDescription,
        description: input.description,
        regionId: region?.id,
        categoryId: category?.id,
        latitude: input.latitude,
        longitude: input.longitude,
        bestSeason: input.bestSeason,
        recommendedDuration: input.recommendedDuration,
        difficulty: input.difficulty,
        entranceFee: input.entranceFee,
        parking: input.parking,
        familyFriendly: input.familyFriendly,
        tags: input.tags,
        status: input.status,
      },
    });
  }

  async deletePlace(placeId: string): Promise<void> {
    await prisma.place.delete({ where: { id: placeId } });
  }
}

export const placeService: PlaceService = new PrismaPlaceService();
