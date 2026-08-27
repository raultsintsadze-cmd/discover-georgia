"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Star, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

interface DriverWithPrice {
  id: string;
  name: string;
  photoUrl: string | null;
  rating: number | null;
  vehicle: string | null;
  languages: string[];
  tripsCompleted: number;
  regions: string[];
  estimatedPriceGel: number | null;
}

export interface DriverSelectorProps {
  tripId: string;
  preferredDriverId: string | null;
  onSelected: (driverId: string) => void;
  /**
   * Lifted from the Route & cost section, which is now a permanently-mounted
   * sibling instead of a tab this component used to remount into — so a
   * fetch-once-on-mount effect would otherwise keep showing stale
   * ("—") per-driver prices even after route calculation completes.
   * Included in the fetch effect's deps so per-driver prices refresh the
   * moment a route becomes available (or gets invalidated by a place edit).
   */
  routeComputed: boolean;
}

/** Spec §27 driver cards: photo/name/rating/vehicle/languages/trips/regions/estimated price + Select. */
export function DriverSelector({ tripId, preferredDriverId, onSelected, routeComputed }: DriverSelectorProps) {
  const t = useTranslations("trip");
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [drivers, setDrivers] = React.useState<DriverWithPrice[]>([]);
  const [selectingId, setSelectingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setLoading(true);
    fetch(`/api/trips/${tripId}/drivers`)
      .then((res) => res.json())
      .then((body) => {
        setDrivers(body.data?.drivers ?? []);
      })
      .finally(() => setLoading(false));
  }, [tripId, routeComputed]);

  async function handleSelect(driverId: string) {
    setSelectingId(driverId);
    try {
      const res = await fetch(`/api/trips/${tripId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ preferredDriverId: driverId }),
      });
      if (!res.ok) {
        const body = await res.json();
        toast({ title: t("driverSelector.selectErrorTitle"), description: body?.error?.message, variant: "danger" });
        return;
      }
      onSelected(driverId);
      toast({ title: t("driverSelector.selectedToast"), variant: "success" });
    } finally {
      setSelectingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  if (drivers.length === 0) {
    return <p className="text-body-sm text-ink-500">{t("driverSelector.noDrivers")}</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      {!routeComputed && (
        <p className="text-body-sm text-ink-500">{t("driverSelector.calculatePrompt")}</p>
      )}
      {drivers.map((driver) => {
        const selected = driver.id === preferredDriverId;
        return (
          <div
            key={driver.id}
            className={cn(
              "rounded-lg border p-3.5",
              selected ? "border-accent-500 bg-accent-tint" : "border-border bg-surface-1"
            )}
          >
            <div className="flex items-start gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-surface-2 text-h3 text-ink-500">
                {driver.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-body-sm font-medium text-ink-900">{driver.name}</p>
                  {driver.rating != null && (
                    <span className="flex shrink-0 items-center gap-0.5 text-caption text-ink-500">
                      <Star className="h-3 w-3 fill-current text-warning-500" aria-hidden="true" />
                      {driver.rating.toFixed(1)}
                    </span>
                  )}
                </div>
                <p className="text-caption text-ink-500">
                  {driver.vehicle} · {t("driverSelector.tripsCount", { count: driver.tripsCompleted })}
                </p>
                <p className="text-caption text-ink-500">{driver.languages.join(", ")}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {driver.regions.map((r) => (
                    <Badge key={r} variant="neutral">
                      {r}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <p className="text-body-sm font-medium text-ink-900">
                {driver.estimatedPriceGel != null ? `~${driver.estimatedPriceGel.toLocaleString()} GEL` : "—"}
              </p>
              <Button
                size="sm"
                variant={selected ? "secondary" : "outline"}
                loading={selectingId === driver.id}
                onClick={() => handleSelect(driver.id)}
              >
                {selected ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {t("driverSelector.selectedButton")}
                  </>
                ) : (
                  t("driverSelector.selectButton")
                )}
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
