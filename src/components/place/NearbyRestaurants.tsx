import { getTranslations } from "next-intl/server";
import { Star, ExternalLink } from "lucide-react";
import { Reveal } from "@/components/motion/Reveal";
import type { RestaurantDTO } from "@/lib/services/restaurant.service";

function priceLevelLabel(level: number | null, unavailableLabel: string): string {
  if (level == null) return unavailableLabel;
  return "$".repeat(level);
}

export async function NearbyRestaurants({ restaurants }: { restaurants: RestaurantDTO[] }) {
  if (restaurants.length === 0) return null;
  const t = await getTranslations("place");

  return (
    <div>
      <p className="text-h3 text-ink-900">{t("nearbyRestaurants.title")}</p>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
        {restaurants.map((restaurant, i) => (
          <Reveal
            key={restaurant.id}
            index={i}
            direction="right"
            className="w-56 shrink-0 rounded-lg border border-border bg-surface-1 p-3"
          >
            <p className="truncate text-body-sm font-medium text-ink-900">{restaurant.name}</p>
            <p className="mt-0.5 text-caption text-ink-500">{restaurant.cuisine ?? t("nearbyRestaurants.defaultCuisine")}</p>
            <div className="mt-1.5 flex items-center gap-1 text-caption text-ink-500">
              <Star className="h-3.5 w-3.5 text-warning-500" aria-hidden="true" />
              <span>{restaurant.rating != null ? restaurant.rating.toFixed(1) : t("nearbyRestaurants.notRated")}</span>
            </div>
            <p className="mt-1 text-caption text-ink-700">
              {priceLevelLabel(restaurant.priceLevel, t("nearbyRestaurants.priceUnavailable"))}
            </p>
            {restaurant.bookingUrl && (
              <a
                href={restaurant.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-caption font-medium text-accent-500"
              >
                {t("nearbyRestaurants.book")} <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </Reveal>
        ))}
      </div>
    </div>
  );
}
