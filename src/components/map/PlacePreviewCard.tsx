"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, Navigation } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatDistanceMeters } from "@/lib/utils/format";
import type { PlaceSummary, PlaceWithDistance } from "@/lib/services/place.service";

export function PlacePreviewCard({
  place,
  onBack,
}: {
  place: PlaceSummary | PlaceWithDistance;
  onBack: () => void;
}) {
  const t = useTranslations("map");
  const distance = "distanceMeters" in place ? place.distanceMeters : undefined;
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${place.location.latitude},${place.location.longitude}`;

  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-2 flex items-center gap-1 text-body-sm text-ink-500"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {t("backToList")}
      </button>
      <p className="text-h3 text-ink-900">{place.name}</p>
      <p className="mt-1 text-body-sm text-ink-500">{place.shortDescription}</p>
      <div className="mt-2 flex flex-wrap items-center gap-1.5">
        <Badge variant="neutral">{place.regionName}</Badge>
        <Badge variant="accent">{place.categoryName}</Badge>
        {distance !== undefined && (
          <Badge variant="wine">{t("distanceAway", { distance: formatDistanceMeters(distance) })}</Badge>
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <Button className="flex-1" onClick={() => window.open(mapsUrl, "_blank", "noopener,noreferrer")}>
          <Navigation className="h-4 w-4" aria-hidden="true" />
          {t("navigate")}
        </Button>
        <Link href={`/places/${place.slug}`} className="flex-1">
          <Button variant="secondary" className="w-full">
            {t("viewPlace")}
          </Button>
        </Link>
      </div>
    </div>
  );
}
