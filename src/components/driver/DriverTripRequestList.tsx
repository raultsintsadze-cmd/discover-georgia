"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import { formatDistanceMeters, formatDuration, formatDateRange } from "@/lib/utils/format";

interface TripRequestRow {
  id: string;
  status: string;
  passengers: number;
  distanceMeters: number;
  durationSeconds: number;
  estimatedPriceGel: number;
  startDate: string | null;
  endDate: string | null;
}

// Shared with src/app/trip-requests/[id]/page.tsx and TripFormSheet's
// RequestTripPanel — keep status label keys in sync across all three.
const STATUS_LABEL_KEYS: Record<string, string> = {
  PENDING: "statusPending",
  DRIVER_ACCEPTED: "statusDriverAccepted",
  CONFIRMED: "statusConfirmed",
  IN_PROGRESS: "statusInProgress",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
};

export function DriverTripRequestList() {
  const t = useTranslations("driver");
  const tStatus = useTranslations("tripRequest");
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [requests, setRequests] = React.useState<TripRequestRow[]>([]);
  const [respondingId, setRespondingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/driver/trip-requests")
      .then((res) => res.json())
      .then((body) => setRequests(body.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function respond(id: string, status: "DRIVER_ACCEPTED" | "CANCELLED") {
    setRespondingId(id);
    try {
      const res = await fetch(`/api/driver/trip-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: t("updateErrorToastTitle"), description: body?.error?.message, variant: "danger" });
        return;
      }
      toast({ title: status === "DRIVER_ACCEPTED" ? t("acceptedToast") : t("declinedToast"), variant: "success" });
      load();
    } finally {
      setRespondingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  if (requests.length === 0) {
    return <EmptyState title={t("emptyTitle")} description={t("emptyDescription")} />;
  }

  return (
    <div className="flex flex-col gap-3 px-5 pb-8">
      {requests.map((r) => (
        <Card key={r.id}>
          <CardContent className="pt-4">
            <div className="flex items-center justify-between gap-2">
              <p className="text-body-sm font-medium text-ink-900">{t("tripIdLabel", { id: r.id.slice(-8).toUpperCase() })}</p>
              <Badge variant={r.status === "PENDING" ? "warning" : r.status === "CANCELLED" ? "danger" : "accent"}>
                {(() => {
                  const key = STATUS_LABEL_KEYS[r.status];
                  return key ? tStatus(key) : r.status.replaceAll("_", " ");
                })()}
              </Badge>
            </div>
            <p className="mt-1 text-caption text-ink-500">{formatDateRange(r.startDate, r.endDate)}</p>
            <p className="text-caption text-ink-500">
              {t("passengersCount", { count: r.passengers })} · {formatDistanceMeters(r.distanceMeters)} ·{" "}
              {formatDuration(Math.round(r.durationSeconds / 60))}
            </p>
            <p className="mt-1 text-body-sm font-medium text-ink-900">
              {t("priceLabel", { amount: r.estimatedPriceGel.toLocaleString() })}
            </p>

            <div className="mt-3 flex items-center gap-2">
              <Link href={`/trip-requests/${r.id}`} className="text-body-sm font-medium text-accent-500">
                {t("viewDetails")}
              </Link>
              {r.status === "PENDING" && (
                <div className="ml-auto flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    loading={respondingId === r.id}
                    onClick={() => respond(r.id, "CANCELLED")}
                  >
                    <X className="h-4 w-4" aria-hidden="true" />
                    {t("decline")}
                  </Button>
                  <Button size="sm" loading={respondingId === r.id} onClick={() => respond(r.id, "DRIVER_ACCEPTED")}>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    {t("accept")}
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
