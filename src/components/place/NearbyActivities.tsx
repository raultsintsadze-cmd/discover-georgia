import { getTranslations } from "next-intl/server";
import { Star, ExternalLink } from "lucide-react";
import type { ActivityDTO } from "@/lib/services/activity.service";

export async function NearbyActivities({ activities }: { activities: ActivityDTO[] }) {
  if (activities.length === 0) return null;
  const t = await getTranslations("place");
  const categoryLabels: Record<string, string> = {
    TOUR: t("nearbyActivities.categories.TOUR"),
    WINE_TASTING: t("nearbyActivities.categories.WINE_TASTING"),
    ADVENTURE: t("nearbyActivities.categories.ADVENTURE"),
    CULTURE: t("nearbyActivities.categories.CULTURE"),
    GENERAL: t("nearbyActivities.categories.GENERAL"),
  };

  return (
    <div>
      <p className="text-h3 text-ink-900">{t("nearbyActivities.title")}</p>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
        {activities.map((activity) => (
          <div key={activity.id} className="w-56 shrink-0 rounded-lg border border-border bg-surface-1 p-3">
            <p className="truncate text-body-sm font-medium text-ink-900">{activity.name}</p>
            <p className="mt-0.5 text-caption text-ink-500">{categoryLabels[activity.category] ?? activity.category}</p>
            <div className="mt-1.5 flex items-center gap-1 text-caption text-ink-500">
              <Star className="h-3.5 w-3.5 text-warning-500" aria-hidden="true" />
              <span>{activity.rating != null ? activity.rating.toFixed(1) : t("nearbyActivities.notRated")}</span>
            </div>
            <p className="mt-1 text-caption text-ink-700">
              {activity.price != null
                ? t("nearbyActivities.price", { price: activity.price.toLocaleString() })
                : t("nearbyActivities.priceUnavailable")}
            </p>
            {activity.bookingUrl && (
              <a
                href={activity.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-caption font-medium text-accent-500"
              >
                {t("nearbyActivities.book")} <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
