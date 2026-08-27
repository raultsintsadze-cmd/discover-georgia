"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Route as RouteIcon } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { TripMap } from "./TripMap";
import { TripScoreCard } from "./TripScoreCard";
import { formatDistanceMeters, formatDuration } from "@/lib/utils/format";
import type { MapPlace } from "@/components/map/PlaceMarkers";
import type { RouteSegment } from "@/lib/services/route.service";
import type { TripDTO, TripSummary } from "@/lib/services/trip.service";

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <p className="text-body-sm text-ink-500">{label}</p>
      <p className="text-body-sm font-medium text-ink-900">{value}</p>
    </div>
  );
}

/**
 * Route/cost/map, merged from what used to be a separate Map tab (route
 * calculation + polylines) and Budget tab (distance/time/price stats). Also
 * owns route calculation itself: it used to take a manual button press on
 * the Map tab, which most people never found — now it fires automatically
 * as soon as there are 2+ places and no cached Route rows (TripService
 * deletes those on any place add/remove/reorder, so this re-fires exactly
 * when the old button would have needed a click).
 */
export function TripRouteAndCost({
  trip,
  places,
  onRouteComputedChange,
}: {
  trip: TripDTO;
  places: MapPlace[];
  onRouteComputedChange: (computed: boolean) => void;
}) {
  const t = useTranslations("trip");
  const { toast } = useToast();
  const [summary, setSummary] = React.useState<TripSummary | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [segments, setSegments] = React.useState<RouteSegment[]>([]);
  const [calculating, setCalculating] = React.useState(false);
  const placesCount = places.length;

  const load = React.useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, routeRes] = await Promise.all([
        fetch(`/api/trips/${trip.id}/summary`),
        fetch(`/api/trips/${trip.id}/route`),
      ]);
      const summaryBody = await summaryRes.json();
      const routeBody = await routeRes.json();
      let nextSummary: TripSummary | null = summaryBody.data ?? null;
      let nextSegments: RouteSegment[] = routeBody.data?.segments ?? [];

      if (!nextSummary?.routeComputed && placesCount >= 2) {
        setCalculating(true);
        try {
          const calcRes = await fetch(`/api/trips/${trip.id}/route`, { method: "POST" });
          const calcBody = await calcRes.json();
          if (calcRes.ok) {
            nextSegments = calcBody.data.segments;
            const rescored = await fetch(`/api/trips/${trip.id}/summary`);
            nextSummary = (await rescored.json()).data ?? nextSummary;
          } else {
            toast({ title: t("route.calculateErrorTitle"), description: calcBody?.error?.message, variant: "danger" });
          }
        } finally {
          setCalculating(false);
        }
      }

      setSummary(nextSummary);
      setSegments(nextSegments);
      onRouteComputedChange(nextSummary?.routeComputed ?? false);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trip.id, placesCount]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleRecalculate() {
    setCalculating(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}/route`, { method: "POST" });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: t("route.calculateErrorTitle"), description: body?.error?.message, variant: "danger" });
        return;
      }
      setSegments(body.data.segments);
      const summaryRes = await fetch(`/api/trips/${trip.id}/summary`);
      const summaryBody = await summaryRes.json();
      setSummary(summaryBody.data ?? null);
      onRouteComputedChange(summaryBody.data?.routeComputed ?? false);
    } finally {
      setCalculating(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-4">
          <StatRow
            label={t("budget.budgetLabel")}
            value={trip.budget != null ? `${trip.budget.toLocaleString()} GEL` : t("budget.budgetNotSet")}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-4">
          {loading || calculating ? (
            <div className="flex flex-col items-center gap-2 py-4">
              <Spinner />
              {calculating && <p className="text-caption text-ink-500">{t("route.checkingRoute")}</p>}
            </div>
          ) : summary?.routeComputed ? (
            <>
              <StatRow label={t("budget.totalDistanceLabel")} value={formatDistanceMeters(summary.totalDistanceMeters)} />
              <StatRow
                label={t("budget.totalDrivingTimeLabel")}
                value={formatDuration(Math.round(summary.totalDrivingSeconds / 60))}
              />
              <StatRow
                label={t("budget.estimatedPriceLabel")}
                value={`${summary.estimatedTransportCostGel.toLocaleString()} GEL`}
              />
            </>
          ) : (
            <p className="text-body-sm text-ink-500">{t("budget.routeUnavailable")}</p>
          )}
        </CardContent>
      </Card>

      <div className="h-[45vh] overflow-hidden rounded-lg border border-border">
        <TripMap places={places} segments={segments} />
      </div>

      {placesCount >= 2 && (
        <Button size="sm" variant="outline" loading={calculating} onClick={handleRecalculate} className="self-start">
          <RouteIcon className="h-4 w-4" aria-hidden="true" />
          {t("route.recalculateButton")}
        </Button>
      )}

      <TripScoreCard tripId={trip.id} />
    </div>
  );
}
