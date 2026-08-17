import "server-only";
import { prisma } from "@/lib/db/client";
import { PlaceStatus } from "@prisma/client";

export interface FeedVideo {
  id: string;
  url: string;
  posterUrl: string | null;
}

export interface FeedItem {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  regionName: string;
  categoryName: string;
  latitude: number;
  longitude: number;
  video: FeedVideo | null;
}

export interface FeedPage {
  items: FeedItem[];
  hasMore: boolean;
}

/**
 * Shared by the Discover page's initial server-rendered load and the
 * /api/feed route it paginates against, so the two never drift.
 * Deterministic alphabetical ordering for now — stable across pages, no
 * ranking/curation system yet (that's a Phase 8-adjacent concern once
 * there's signal to rank on).
 */
export async function getFeedPage(page: number, pageSize: number): Promise<FeedPage> {
  const places = await prisma.place.findMany({
    where: { status: PlaceStatus.PUBLISHED },
    include: { region: true, category: true, featuredVideo: true },
    orderBy: { name: "asc" },
    skip: (page - 1) * pageSize,
    take: pageSize,
  });

  const items: FeedItem[] = places.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    regionName: p.region.name,
    categoryName: p.category.name,
    latitude: p.latitude,
    longitude: p.longitude,
    video: p.featuredVideo ? { id: p.featuredVideo.id, url: p.featuredVideo.url, posterUrl: p.featuredVideo.posterUrl } : null,
  }));

  return { items, hasMore: places.length === pageSize };
}
