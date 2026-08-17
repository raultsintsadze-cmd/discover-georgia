"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card, CardContent } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { DriverSelector } from "./DriverSelector";
import { TripScoreCard } from "./TripScoreCard";
import { RequestTripPanel } from "./RequestTripPanel";
import { formatDistanceMeters, formatDuration } from "@/lib/utils/format";
import type { TripDTO, TripSummary } from "@/lib/services/trip.service";

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <p className="text-body-sm text-ink-500">{label}</p>
      <p className="text-body-sm font-medium text-ink-900">{value}</p>
    </div>
  );
}

export function TripBudget({ trip, onTripChange }: { trip: TripDTO; onTripChange: (trip: TripDTO) => void }) {
  const t = useTranslations("trip");
  const [summary, setSummary] = React.useState<TripSummary | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/trips/${trip.id}/summary`)
      .then((res) => res.json())
      .then((body) => setSummary(body.data ?? null))
      .finally(() => setLoading(false));
  }, [trip.id]);

  return (
    <div className="flex flex-col gap-4 px-5 pb-8">
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
          {loading ? (
            <div className="flex justify-center py-4">
              <Spinner />
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
            <p className="text-body-sm text-ink-500">
              {t("budget.routeUnavailable")}
            </p>
          )}
        </CardContent>
      </Card>

      <TripScoreCard tripId={trip.id} />

      <div>
        <p className="mb-2 text-h3 text-ink-900">{t("budget.driversHeading")}</p>
        <DriverSelector
          tripId={trip.id}
          preferredDriverId={trip.preferredDriverId}
          onSelected={(driverId) => onTripChange({ ...trip, preferredDriverId: driverId })}
        />
      </div>

      <RequestTripPanel tripId={trip.id} defaultPassengers={trip.travelers} routeComputed={summary?.routeComputed ?? false} />
    </div>
  );
}
