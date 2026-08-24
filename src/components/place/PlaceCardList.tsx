import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { EmptyState } from "@/components/ui/EmptyState";
import { Reveal } from "@/components/motion/Reveal";
import type { PlaceSummary } from "@/lib/services/place.service";

export async function PlaceCardList({ places }: { places: PlaceSummary[] }) {
  if (places.length === 0) {
    const t = await getTranslations("place");
    return <EmptyState title={t("cardList.emptyTitle")} description={t("cardList.emptyDescription")} />;
  }

  return (
    <div className="flex flex-col gap-3 px-5">
      {places.map((place, i) => (
        <Reveal key={place.id} index={i}>
          <Link href={`/places/${place.slug}`} className="flex items-start gap-3 rounded-lg border border-border bg-surface-1 p-3.5">
            <div className="min-w-0 flex-1">
              <p className="text-caption font-medium uppercase tracking-wide text-ink-500">
                {place.regionName} · {place.categoryName}
              </p>
              <p className="text-body font-medium text-ink-900">{place.name}</p>
              <p className="mt-0.5 line-clamp-2 text-body-sm text-ink-500">{place.shortDescription}</p>
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
