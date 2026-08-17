"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TripMap } from "./TripMap";
import { formatDistanceMeters, formatDuration } from "@/lib/utils/format";
import type { MapPlace } from "@/components/map/PlaceMarkers";
import type { RouteSegment } from "@/lib/services/route.service";

export function TripRouteSection({ tripId, places }: { tripId: string; places: MapPlace[] }) {
  const t = useTranslations("trip");
  const { toast } = useToast();
  const [segments, setSegments] = React.useState<RouteSegment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [calculating, setCalculating] = React.useState(false);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/trips/${tripId}/route`)
      .then((res) => res.json())
      .then((body) => setSegments(body.data?.segments ?? []))
      .finally(() => setLoading(false));
    // Re-check whenever the place set size changes (add/remove invalidates server-side too).
  }, [tripId, places.length]);

  async function handleCalculate() {
    setCalculating(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/route`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: t("route.calculateErrorTitle"), description: body?.error?.message, variant: "danger" });
        return;
      }
      setSegments(body.data.segments);
    } finally {
      setCalculating(false);
    }
  }

  const totalDistanceMeters = segments.reduce((sum, s) => sum + s.distanceMeters, 0);
  const totalDurationSeconds = segments.reduce((sum, s) => sum + s.durationSeconds, 0);

  return (
    <div className="flex h-[60vh] flex-col gap-3 px-5">
      {places.length >= 2 && (
        <div className="flex items-center justify-between rounded-md border border-border bg-surface-1 px-3.5 py-2.5">
          {loading ? (
            <p className="text-body-sm text-ink-500">{t("route.checkingRoute")}</p>
          ) : segments.length > 0 ? (
            <div className="flex items-center gap-4">
              <p className="text-body-sm font-medium text-ink-900">{formatDistanceMeters(totalDistanceMeters)}</p>
              <p className="text-body-sm font-medium text-ink-900">
                {formatDuration(Math.round(totalDurationSeconds / 60))}
              </p>
            </div>
          ) : (
            <p className="text-body-sm text-ink-500">{t("route.notCalculated")}</p>
          )}
          <Button size="sm" variant="outline" loading={calculating} onClick={handleCalculate}>
            <RouteIcon className="h-4 w-4" aria-hidden="true" />
            {segments.length > 0 ? t("route.recalculateButton") : t("route.calculateButton")}
          </Button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-border">
        <TripMap places={places} segments={segments} />
      </div>
    </div>
  );
}
