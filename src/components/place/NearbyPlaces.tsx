import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Reveal } from "@/components/motion/Reveal";
import type { PlaceSummary } from "@/lib/services/place.service";

export async function NearbyPlaces({ places }: { places: PlaceSummary[] }) {
  if (places.length === 0) return null;
  const t = await getTranslations("place");

  return (
    <div>
      <p className="text-h3 text-ink-900">{t("nearbyPlaces.title")}</p>
      <div className="no-scrollbar mt-3 flex gap-3 overflow-x-auto pb-1">
        {places.map((place, i) => (
          <Reveal key={place.id} index={i} direction="right" className="w-48 shrink-0">
            <Link href={`/places/${place.slug}`} className="block rounded-lg border border-border bg-surface-1 p-3">
              <p className="truncate text-body-sm font-medium text-ink-900">{place.name}</p>
              <p className="mt-0.5 text-caption text-ink-500">{place.regionName}</p>
              <p className="mt-1.5 line-clamp-2 text-caption text-ink-500">{place.shortDescription}</p>
            </Link>
          </Reveal>
        ))}
      </div>
    </div>
  );
}
