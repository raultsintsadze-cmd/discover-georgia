import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { placeService } from "@/lib/services/impl/PlaceService";
import { hotelService } from "@/lib/services/impl/HotelService";
import { restaurantService } from "@/lib/services/impl/RestaurantService";
import { activityService } from "@/lib/services/impl/ActivityService";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { PlaceHero } from "@/components/place/PlaceHero";
import { PlaceActionRow } from "@/components/place/PlaceActionRow";
import { PlaceQuickInfo } from "@/components/place/PlaceQuickInfo";
import { PlaceMiniMap } from "@/components/place/PlaceMiniMap";
import { NearbyPlaces } from "@/components/place/NearbyPlaces";
import { NearbyHotels } from "@/components/place/NearbyHotels";
import { NearbyRestaurants } from "@/components/place/NearbyRestaurants";
import { NearbyActivities } from "@/components/place/NearbyActivities";

interface PlacePageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: PlacePageProps): Promise<Metadata> {
  const { slug } = await params;
  const place = await placeService.getBySlug(slug);
  if (!place) return {};
  const locale = await getLocale();
  return {
    title: place.name,
    description: place.shortDescription,
    alternates: { canonical: `/places/${slug}` },
    openGraph: {
      title: place.name,
      description: place.shortDescription,
      url: `/places/${slug}`,
      type: "article",
      locale,
      images: place.featuredVideoPosterUrl ? [{ url: place.featuredVideoPosterUrl }] : undefined,
    },
  };
}

export default async function PlacePage({ params }: PlacePageProps) {
  const { slug } = await params;
  const place = await placeService.getBySlug(slug);
  if (!place) notFound();
  const t = await getTranslations("place");

  const [nearby, hotels, restaurants, activities] = await Promise.all([
    placeService.getManyByIds(place.nearbyPlaceIds),
    hotelService.listNearPlace(place.id),
    restaurantService.listNearPlace(place.id),
    activityService.listNearPlace(place.id),
  ]);

  const session = await auth();
  const initialSaved = session?.user
    ? (await prisma.savedPlace.findUnique({
        where: { userId_placeId: { userId: session.user.id, placeId: place.id } },
        select: { id: true },
      })) !== null
    : false;

  return (
    <div className="pb-12">
      <PlaceHero name={place.name} regionName={place.regionName} categoryName={place.categoryName} />
      <PlaceActionRow
        placeId={place.id}
        placeName={place.name}
        latitude={place.location.latitude}
        longitude={place.location.longitude}
        initialSaved={initialSaved}
      />

      <div className="flex flex-col gap-6 px-5 pt-5">
        <div>
          <p className="text-body text-ink-900">{place.shortDescription}</p>
          <p className="mt-3 whitespace-pre-line text-body-sm text-ink-700">{place.description}</p>
        </div>

        <PlaceQuickInfo
          recommendedDuration={place.recommendedDuration}
          bestSeason={place.bestSeason}
          difficulty={place.difficulty}
          entranceFee={place.entranceFee}
          parking={place.parking}
          familyFriendly={place.familyFriendly}
        />

        <div>
          <p className="mb-2 text-h3 text-ink-900">{t("map.title")}</p>
          <PlaceMiniMap
            id={place.id}
            slug={place.slug}
            name={place.name}
            latitude={place.location.latitude}
            longitude={place.location.longitude}
          />
        </div>

        <NearbyHotels hotels={hotels} />
        <NearbyRestaurants restaurants={restaurants} />
        <NearbyActivities activities={activities} />

        <NearbyPlaces places={nearby} />
      </div>
    </div>
  );
}
