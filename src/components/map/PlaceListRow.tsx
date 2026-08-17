"use client";

import { ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDistanceMeters } from "@/lib/utils/format";
import type { PlaceSummary, PlaceWithDistance } from "@/lib/services/place.service";

export function PlaceListRow({
  place,
  onSelect,
}: {
  place: PlaceSummary | PlaceWithDistance;
  onSelect: () => void;
}) {
  const distance = "distanceMeters" in place ? place.distanceMeters : undefined;

  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex w-full items-center gap-3 border-b border-border py-3 text-left last:border-b-0"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-medium text-ink-900">{place.name}</p>
        <p className="mt-0.5 truncate text-body-sm text-ink-500">{place.shortDescription}</p>
        <div className="mt-1.5 flex items-center gap-1.5">
          <Badge variant="neutral">{place.regionName}</Badge>
          <Badge variant="accent">{place.categoryName}</Badge>
          {distance !== undefined && <Badge variant="wine">{formatDistanceMeters(distance)}</Badge>}
        </div>
      </div>
      <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />
    </button>
  );
}
