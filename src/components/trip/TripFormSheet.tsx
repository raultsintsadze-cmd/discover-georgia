"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BottomSheet, BottomSheetContent } from "@/components/ui/BottomSheet";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import type { TripDTO } from "@/lib/services/trip.service";

function toDateInputValue(date: Date | string | null | undefined): string {
  if (!date) return "";
  return new Date(date).toISOString().slice(0, 10);
}

export interface TripFormSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  trip?: TripDTO;
  onSaved: (trip: TripDTO) => void;
  onDeleted?: () => void;
}

export function TripFormSheet({ open, onOpenChange, mode, trip, onSaved, onDeleted }: TripFormSheetProps) {
  const t = useTranslations("trip");
  const { toast } = useToast();
  const [name, setName] = React.useState(trip?.name ?? "");
  const [startDate, setStartDate] = React.useState(toDateInputValue(trip?.startDate));
  const [endDate, setEndDate] = React.useState(toDateInputValue(trip?.endDate));
  const [travelers, setTravelers] = React.useState(trip?.travelers ?? 2);
  const [budget, setBudget] = React.useState(trip?.budget != null ? String(trip.budget) : "");
  const [loading, setLoading] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Reset the form to the current trip's values each time the sheet opens.
  React.useEffect(() => {
    if (!open) return;
    setName(trip?.name ?? "");
    setStartDate(toDateInputValue(trip?.startDate));
    setEndDate(toDateInputValue(trip?.endDate));
    setTravelers(trip?.travelers ?? 2);
    setBudget(trip?.budget != null ? String(trip.budget) : "");
    setError(null);
  }, [open, trip]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(mode === "create" ? "/api/trips" : `/api/trips/${trip!.id}`, {
        method: mode === "create" ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          startDate,
          endDate,
          travelers,
          budget: budget ? Number(budget) : undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? t("form.saveError"));
        return;
      }
      onSaved(body.data);
      onOpenChange(false);
    } catch {
      setError(t("form.genericError"));
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete() {
    if (!trip) return;
    const confirmMessage = t("form.deleteConfirm", { name: trip.name });
    if (typeof window !== "undefined" && !window.confirm(confirmMessage)) {
      return;
    }
    setDeleting(true);
    try {
      const res = await fetch(`/api/trips/${trip.id}`, { method: "DELETE" });
      if (!res.ok) {
        const body = await res.json();
        toast({ title: t("form.deleteErrorTitle"), description: body?.error?.message, variant: "danger" });
        return;
      }
      onOpenChange(false);
      onDeleted?.();
    } finally {
      setDeleting(false);
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent title={mode === "create" ? t("form.createTitle") : t("form.editTitle")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label={t("form.nameLabel")} required>
            {(fieldProps) => (
              <Input {...fieldProps} value={name} onChange={(e) => setName(e.target.value)} required />
            )}
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("form.startDateLabel")} required>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field label={t("form.endDateLabel")} required>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="date"
                  value={endDate}
                  min={startDate || undefined}
                  onChange={(e) => setEndDate(e.target.value)}
                  required
                />
              )}
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={t("form.travelersLabel")} required>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="number"
                  min={1}
                  max={20}
                  value={travelers}
                  onChange={(e) => setTravelers(Number(e.target.value))}
                  required
                />
              )}
            </Field>
            <Field label={t("form.budgetLabel")} helperText={t("form.budgetHelper")}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="number"
                  min={0}
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              )}
            </Field>
          </div>

          {error && (
            <p className="text-body-sm text-danger-500" role="alert">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading}>
            {mode === "create" ? t("form.createButton") : t("form.saveButton")}
          </Button>

          {mode === "edit" && (
            <Button type="button" variant="outline" className="text-danger-500" loading={deleting} onClick={handleDelete}>
              {t("form.deleteButton")}
            </Button>
          )}
        </form>
      </BottomSheetContent>
    </BottomSheet>
  );
}
