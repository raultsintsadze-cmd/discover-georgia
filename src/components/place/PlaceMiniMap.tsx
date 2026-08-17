"use client";

import { useTranslations } from "next-intl";
import { PlaceMap } from "@/components/map/PlaceMap";
import { formatCoordinate } from "@/lib/utils/format";

const MINI_MAP_ZOOM = 13;

export function PlaceMiniMap({
  id,
  slug,
  name,
  latitude,
  longitude,
}: {
  id: string;
  slug: string;
  name: string;
  latitude: number;
  longitude: number;
}) {
  const t = useTranslations("place");
  return (
    <div>
      <div className="h-48 w-full overflow-hidden rounded-lg border border-border">
        <PlaceMap
          places={[{ id, slug, name, latitude, longitude }]}
          onSelectPlace={() => {}}
          userLocation={null}
          center={{ latitude, longitude }}
          zoom={MINI_MAP_ZOOM}
        />
      </div>
      <p className="mt-2 text-body-sm text-ink-500">{t("map.gpsLabel", { coordinate: formatCoordinate(latitude, longitude) })}</p>
    </div>
  );
}
