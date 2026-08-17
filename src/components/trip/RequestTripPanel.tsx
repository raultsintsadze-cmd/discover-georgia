"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Card, CardContent } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";

interface ExistingRequest {
  id: string;
  status: string;
}

// Mirrors the TripRequestStatus -> label-key map in
// src/app/trip-requests/[id]/page.tsx — kept local here since `status` on
// ExistingRequest is a plain string, not the TripRequestStatus union.
const STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING: "statusPending",
  DRIVER_ACCEPTED: "statusDriverAccepted",
  CONFIRMED: "statusConfirmed",
  IN_PROGRESS: "statusInProgress",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
};

export function RequestTripPanel({
  tripId,
  defaultPassengers,
  routeComputed,
}: {
  tripId: string;
  defaultPassengers: number;
  routeComputed: boolean;
}) {
  const t = useTranslations("trip");
  const tRequest = useTranslations("tripRequest");
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [existing, setExisting] = React.useState<ExistingRequest | null>(null);
  const [passengers, setPassengers] = React.useState(String(defaultPassengers));
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/trip-requests/mine")
      .then((res) => res.json())
      .then((body) => {
        const forThisTrip = (body.data ?? []).find(
          (r: { tripId: string; status: string; id: string }) =>
            r.tripId === tripId && r.status !== "CANCELLED"
        );
        setExisting(forThisTrip ?? null);
      })
      .finally(() => setLoading(false));
  }, [tripId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const passengerCount = Number(passengers);
    if (!Number.isFinite(passengerCount) || passengerCount < 1) {
      toast({ title: t("requestPanel.invalidPassengers"), variant: "danger" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/trip-requests", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": crypto.randomUUID(),
        },
        body: JSON.stringify({ tripId, passengers: passengerCount, notes: notes.trim() || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: t("requestPanel.requestErrorTitle"), description: body?.error?.message, variant: "danger" });
        return;
      }
      setExisting({ id: body.data.id, status: body.data.status });
      toast({
        title: t("requestPanel.successTitle"),
        description: t("requestPanel.successDescription"),
        variant: "success",
      });
    } catch {
      toast({
        title: t("requestPanel.requestErrorTitle"),
        description: t("requestPanel.requestErrorGeneric"),
        variant: "danger",
      });
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-4">
        <Spinner />
      </div>
    );
  }

  if (existing) {
    const statusLabelKey = STATUS_LABEL_KEYS[existing.status];
    const statusText = statusLabelKey ? tRequest(statusLabelKey) : existing.status;
    return (
      <Card>
        <CardContent className="pt-4">
          <p className="text-h3 text-ink-900">{t("requestPanel.requestedTitle")}</p>
          <p className="mt-1 text-body-sm text-ink-500">
            {t("requestPanel.statusLabel")} <span className="font-medium text-ink-900">{statusText}</span>
          </p>
          <Link href={`/trip-requests/${existing.id}`} className="mt-2 inline-block text-body-sm font-medium text-accent-500">
            {t("requestPanel.viewRequestLink")}
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <p className="mb-1 text-h3 text-ink-900">{t("requestPanel.requestButton")}</p>
        <p className="mb-3 text-caption text-ink-500">
          {t("requestPanel.helperText")}
        </p>
        {!routeComputed && (
          <p className="mb-3 text-body-sm text-ink-500">{t("requestPanel.noRouteWarning")}</p>
        )}
        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <Field label={t("requestPanel.passengersLabel")} required>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="number"
                min={1}
                max={20}
                value={passengers}
                onChange={(e) => setPassengers(e.target.value)}
                disabled={!routeComputed || submitting}
              />
            )}
          </Field>
          <Field label={t("requestPanel.notesLabel")} helperText={t("requestPanel.notesHelper")}>
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                disabled={!routeComputed || submitting}
              />
            )}
          </Field>
          <Button type="submit" loading={submitting} disabled={!routeComputed}>
            {t("requestPanel.requestButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
