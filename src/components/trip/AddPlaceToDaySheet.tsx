"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BottomSheet, BottomSheetContent } from "@/components/ui/BottomSheet";
import { PlacePicker } from "@/components/place/PlacePicker";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { PlaceSummary } from "@/lib/services/place.service";
import type { TripDTO } from "@/lib/services/trip.service";

export interface AddPlaceToDaySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tripId: string;
  dayNumber: number;
  onAdded: (trip: TripDTO) => void;
}

export function AddPlaceToDaySheet({ open, onOpenChange, tripId, dayNumber, onAdded }: AddPlaceToDaySheetProps) {
  const t = useTranslations("trip");
  const { toast } = useToast();
  const [place, setPlace] = React.useState<PlaceSummary | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    if (open) setPlace(null);
  }, [open]);

  async function handleAdd() {
    if (!place) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/places`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dayNumber, placeId: place.id }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: t("addPlaceToDay.addErrorTitle"), description: body?.error?.message, variant: "danger" });
        return;
      }
      onAdded(body.data);
      onOpenChange(false);
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent title={t("addPlaceToDay.sheetTitle", { dayNumber })}>
        <div className="flex flex-col gap-4">
          <PlacePicker value={place} onChange={setPlace} />
          <Button onClick={handleAdd} disabled={!place} loading={loading}>
            {t("addPlaceToDay.addButton")}
          </Button>
        </div>
      </BottomSheetContent>
    </BottomSheet>
  );
}
