"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Route } from "lucide-react";
import { EmptyState } from "@/components/ui/EmptyState";
import { Button } from "@/components/ui/Button";
import { TripFormSheet } from "./TripFormSheet";
import { TripView } from "./TripView";
import type { TripDTO } from "@/lib/services/trip.service";

export function NoTripState() {
  const t = useTranslations("trip");
  const [open, setOpen] = React.useState(false);
  const [trip, setTrip] = React.useState<TripDTO | null>(null);

  if (trip) {
    return <TripView initialTrip={trip} />;
  }

  return (
    <div className="flex flex-1 items-center justify-center">
      <EmptyState
        icon={<Route className="h-6 w-6" aria-hidden="true" />}
        title={t("noTripState.title")}
        description={t("noTripState.description")}
        action={<Button onClick={() => setOpen(true)}>{t("noTripState.startButton")}</Button>}
      />
      <TripFormSheet open={open} onOpenChange={setOpen} mode="create" onSaved={setTrip} />
    </div>
  );
}
