import { getTranslations } from "next-intl/server";
import { Star, ExternalLink } from "lucide-react";
import type { HotelDTO } from "@/lib/services/hotel.service";

export async function NearbyHotels({ hotels }: { hotels: HotelDTO[] }) {
  if (hotels.length === 0) return null;
  const t = await getTranslations("place");

  return (
    <div>
      <p className="text-h3 text-ink-900">{t("nearbyHotels.title")}</p>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
        {hotels.map((hotel) => (
          <div key={hotel.id} className="w-56 shrink-0 rounded-lg border border-border bg-surface-1 p-3">
            <p className="truncate text-body-sm font-medium text-ink-900">{hotel.name}</p>
            <p className="mt-0.5 text-caption text-ink-500">{hotel.category ?? t("nearbyHotels.defaultCategory")}</p>
            <div className="mt-1.5 flex items-center gap-1 text-caption text-ink-500">
              <Star className="h-3.5 w-3.5 text-warning-500" aria-hidden="true" />
              <span>{hotel.rating != null ? hotel.rating.toFixed(1) : t("nearbyHotels.notRated")}</span>
            </div>
            <p className="mt-1 text-caption text-ink-700">
              {hotel.price != null
                ? t("nearbyHotels.pricePerNight", { price: hotel.price.toLocaleString() })
                : t("nearbyHotels.priceUnavailable")}
            </p>
            {hotel.bookingUrl && (
              <a
                href={hotel.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex items-center gap-1 text-caption font-medium text-accent-500"
              >
                {t("nearbyHotels.book")} <ExternalLink className="h-3 w-3" aria-hidden="true" />
              </a>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
