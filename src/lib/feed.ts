import "server-only";
import { prisma } from "@/lib/db/client";
import { PlaceStatus, VideoStatus } from "@prisma/client";
import { toH264PlaybackUrl } from "@/lib/utils/cloudinaryPlayback";

export interface FeedVideo {
  id: string;
  url: string;
  posterUrl: string | null;
}

export interface PlaceFeedItem {
  kind: "place";
  /** Unique per card — the video's id when one is present, else the place's id (the video-less placeholder case). Not the same as placeId once a place has more than one video. */
  id: string;
  placeId: string;
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
  /** Unique per card — always the video's id (activities never get a video-less placeholder). */
  id: string;
  activityId: string;
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
  /** Never null — only activities with at least one approved video get a card at all. */
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
 * One card per published Video (place-tagged or activity-tagged) — a
 * place with 3 approved videos gets 3 separate cards, not one. Places
 * with zero videos still get a single placeholder card (unchanged
 * long-standing behavior, so every place stays discoverable even before
 * its first video lands); activities with zero videos get no card at
 * all, same as before. A video tagged to an activity surfaces as that
 * activity's card, never also as a separate place card, so the same clip
 * is never shown twice.
 *
 * "Featured" (Place.featuredVideoId / Activity.featuredVideoId) no
 * longer gates feed inclusion at all — it's kept only for the Place
 * page's Open Graph share-image (see place page's generateMetadata) and
 * a couple of currently-unused admin endpoints.
 *
 * Sorted and paginated in-memory rather than with DB-level skip/take:
 * Prisma can't express one ORDER BY across two different tables without
 * a raw SQL UNION, and at today's catalog size (dozens of rows) fetching
 * both in full per page is a non-issue. Revisit with a real UNION query
 * if the combined catalog ever grows into the thousands. Multiple videos
 * for the same place/activity share that name, so they sort adjacent to
 * each other (in upload order, since Array.sort is stable) rather than
 * being interleaved with other content — a deliberate simplicity choice,
 * not an oversight.
 */
export async function getFeedPage(page: number, pageSize: number): Promise<FeedPage> {
  // Sequential, not Promise.all — production's DATABASE_URL runs with a
  // small Prisma connection_limit (the transaction-mode pooler's
  // prepared-statement constraint, see schema.prisma's datasource
  // comment), so queries fired concurrently from the same request
  // contend for a shared, limited pool instead of actually running in
  // parallel. Under real traffic that's how you get "Timed out fetching
  // a new connection from the connection pool" (confirmed live in
  // production logs) instead of the small serial-latency cost this avoids.
  const videos = await prisma.video.findMany({
    where: { status: VideoStatus.PUBLISHED },
    include: {
      place: { include: { region: true, category: true } },
      activity: { include: { nearPlace: true } },
    },
    orderBy: { createdAt: "asc" },
  });
  const videolessPlaces = await prisma.place.findMany({
    where: { status: PlaceStatus.PUBLISHED, videos: { none: { status: VideoStatus.PUBLISHED } } },
    include: { region: true, category: true },
  });

  const videoItems: FeedItem[] = videos.map((v) => {
    const feedVideo: FeedVideo = { id: v.id, url: toH264PlaybackUrl(v.url), posterUrl: v.posterUrl };
    // A video's own latitude/longitude (see schema.prisma's Video.latitude
    // comment) overrides its place/activity's coordinates when set — the
    // precise-spot case (a viewpoint/trailhead differing from the place's
    // general location), never the other way around.
    if (v.activityId && v.activity) {
      const a = v.activity;
      return {
        kind: "activity",
        id: v.id,
        activityId: a.id,
        slug: a.slug,
        name: a.name,
        description: a.description,
        price: a.price ? a.price.toNumber() : null,
        category: a.category,
        nearPlaceName: a.nearPlace?.name ?? null,
        nearPlaceSlug: a.nearPlace?.slug ?? null,
        latitude: v.latitude ?? a.latitude,
        longitude: v.longitude ?? a.longitude,
        video: feedVideo,
      };
    }
    const p = v.place;
    return {
      kind: "place",
      id: v.id,
      placeId: p.id,
      slug: p.slug,
      name: p.name,
      shortDescription: p.shortDescription,
      regionName: p.region.name,
      categoryName: p.category.name,
      latitude: v.latitude ?? p.latitude,
      longitude: v.longitude ?? p.longitude,
      video: feedVideo,
    };
  });

  const placeholderItems: FeedItem[] = videolessPlaces.map((p) => ({
    kind: "place",
    id: p.id,
    placeId: p.id,
    slug: p.slug,
    name: p.name,
    shortDescription: p.shortDescription,
    regionName: p.region.name,
    categoryName: p.category.name,
    latitude: p.latitude,
    longitude: p.longitude,
    video: null,
  }));

  const merged = [...videoItems, ...placeholderItems].sort((a, b) => a.name.localeCompare(b.name));
  const start = (page - 1) * pageSize;
  const items = merged.slice(start, start + pageSize);

  return { items, hasMore: merged.length > start + pageSize };
}
