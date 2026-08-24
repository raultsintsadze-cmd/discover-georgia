import "server-only";
import { prisma } from "@/lib/db/client";
import { PlaceStatus } from "@prisma/client";
import { toH264PlaybackUrl } from "@/lib/utils/cloudinaryPlayback";

export interface FeedVideo {
  id: string;
  url: string;
  posterUrl: string | null;
}

export interface PlaceFeedItem {
  kind: "place";
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

export interface ActivityFeedItem {
  kind: "activity";
  id: string;
  slug: string;
  name: string;
  description: string | null;
  price: number | null;
  /** Raw enum (e.g. "ADVENTURE") — translated at render time, same as NearbyActivities and the activity detail page. */
  category: string;
  nearPlaceName: string | null;
  nearPlaceSlug: string | null;
  latitude: number;
  longitude: number;
  /** Never null — only activities with an approved+featured video qualify for the feed at all (see getFeedPage). */
  video: FeedVideo;
}

export type FeedItem = PlaceFeedItem | ActivityFeedItem;

export interface FeedPage {
  items: FeedItem[];
  hasMore: boolean;
}

/**
 * Shared by the Discover page's initial server-rendered load and the
 * /api/feed route it paginates against, so the two never drift.
 *
 * Mixes every published Place (video or not — unchanged long-standing
 * behavior) with Activities that have an approved+featured video (a much
 * smaller, purely additive set — an activity with no video yet would just
 * be an empty card, worse than not showing it at all). Sorted and
 * paginated in-memory rather than with DB-level skip/take: Prisma can't
 * express one ORDER BY across two different tables without a raw SQL
 * UNION, and at today's catalog size (dozens of rows) fetching both
 * tables in full per page is a non-issue. Revisit with a real UNION query
 * if the combined catalog ever grows into the thousands.
 */
export async function getFeedPage(page: number, pageSize: number): Promise<FeedPage> {
  const [places, activities] = await Promise.all([
    prisma.place.findMany({
      where: { status: PlaceStatus.PUBLISHED },
      include: { region: true, category: true, featuredVideo: true },
      orderBy: { name: "asc" },
    }),
    prisma.activity.findMany({
      where: { featuredVideoId: { not: null } },
      include: { featuredVideo: true, nearPlace: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const placeItems: FeedItem[] = places.map((p) => ({
    kind: "place",
    id: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    regionName: p.region.name,
    categoryName: p.category.name,
    latitude: p.latitude,
    longitude: p.longitude,
    video: p.featuredVideo
      ? { id: p.featuredVideo.id, url: toH264PlaybackUrl(p.featuredVideo.url), posterUrl: p.featuredVideo.posterUrl }
      : null,
  }));

  const activityItems: FeedItem[] = activities
    .filter((a): a is typeof a & { featuredVideo: NonNullable<typeof a.featuredVideo> } => a.featuredVideo !== null)
    .map((a) => ({
      kind: "activity",
      id: a.id,
      slug: a.slug,
      name: a.name,
      description: a.description,
      price: a.price ? a.price.toNumber() : null,
      category: a.category,
      nearPlaceName: a.nearPlace?.name ?? null,
      nearPlaceSlug: a.nearPlace?.slug ?? null,
      latitude: a.latitude,
      longitude: a.longitude,
      video: { id: a.featuredVideo.id, url: toH264PlaybackUrl(a.featuredVideo.url), posterUrl: a.featuredVideo.posterUrl },
    }));

  const merged = [...placeItems, ...activityItems].sort((a, b) => a.name.localeCompare(b.name));
  const start = (page - 1) * pageSize;
  const items = merged.slice(start, start + pageSize);

  return { items, hasMore: merged.length > start + pageSize };
}
