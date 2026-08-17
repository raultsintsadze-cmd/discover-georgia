"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Bookmark } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";

export interface SavedPlaceItem {
  placeId: string;
  slug: string;
  name: string;
  shortDescription: string;
  regionName: string;
  categoryName: string;
}

export function SavedPlacesList({ initialItems }: { initialItems: SavedPlaceItem[] }) {
  const t = useTranslations("place");
  const ALL = t("savedList.all");
  const [items, setItems] = React.useState(initialItems);
  const [filter, setFilter] = React.useState(ALL);
  const [removingId, setRemovingId] = React.useState<string | null>(null);

  const categories = React.useMemo(
    () => [ALL, ...Array.from(new Set(items.map((i) => i.categoryName))).sort()],
    [items, ALL]
  );
  const visible = filter === ALL ? items : items.filter((i) => i.categoryName === filter);

  async function handleUnsave(placeId: string) {
    setRemovingId(placeId);
    const previous = items;
    setItems((prev) => prev.filter((i) => i.placeId !== placeId)); // optimistic
    try {
      const res = await fetch(`/api/saved/${placeId}`, { method: "DELETE" });
      if (!res.ok) setItems(previous);
    } catch {
      setItems(previous);
    } finally {
      setRemovingId(null);
    }
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<Bookmark className="h-6 w-6" aria-hidden="true" />}
        title={t("savedList.emptyTitle")}
        description={t("savedList.emptyDescription")}
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-5">
        {categories.map((c) => (
          <button key={c} type="button" onClick={() => setFilter(c)} aria-pressed={filter === c}>
            <Badge
              variant={filter === c ? "accent" : "neutral"}
              className="shrink-0 cursor-pointer px-3 py-1.5 text-body-sm"
            >
              {c}
            </Badge>
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-3 px-5">
        {visible.map((place) => (
          <div key={place.placeId} className="flex items-start gap-3 rounded-lg border border-border bg-surface-1 p-3.5">
            <Link href={`/places/${place.slug}`} className="min-w-0 flex-1">
              <p className="text-caption font-medium uppercase tracking-wide text-ink-500">
                {place.regionName} · {place.categoryName}
              </p>
              <p className="text-body font-medium text-ink-900">{place.name}</p>
              <p className="mt-0.5 line-clamp-2 text-body-sm text-ink-500">{place.shortDescription}</p>
            </Link>
            <button
              type="button"
              onClick={() => handleUnsave(place.placeId)}
              disabled={removingId === place.placeId}
              aria-label={t("savedList.unsave", { name: place.name })}
              className={cn(
                "flex h-touch w-touch shrink-0 items-center justify-center rounded-full text-accent-600",
                "hover:bg-surface-2 disabled:opacity-50"
              )}
            >
              <Bookmark className="h-5 w-5" aria-hidden="true" fill="currentColor" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
