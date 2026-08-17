import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { bookingService } from "@/lib/services/impl/BookingService";
import { driverService } from "@/lib/services/impl/DriverService";
import { BackHeader } from "@/components/shell/BackHeader";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { formatDistanceMeters, formatDuration, formatDateRange } from "@/lib/utils/format";
import type { TripRequestStatus } from "@/lib/services/booking.service";

interface ItinerarySnapshot {
  tripName: string;
  days: { dayNumber: number; places: { name: string }[] }[];
}

const STATUS_VARIANT: Record<string, NonNullable<BadgeProps["variant"]>> = {
  PENDING: "warning",
  DRIVER_ACCEPTED: "accent",
  CONFIRMED: "accent",
  IN_PROGRESS: "accent",
  COMPLETED: "success",
  CANCELLED: "danger",
};

const STATUS_LABEL_KEYS: Record<TripRequestStatus, string> = {
  PENDING: "statusPending",
  DRIVER_ACCEPTED: "statusDriverAccepted",
  CONFIRMED: "statusConfirmed",
  IN_PROGRESS: "statusInProgress",
  COMPLETED: "statusCompleted",
  CANCELLED: "statusCancelled",
};

function StatRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-2.5">
      <p className="text-body-sm text-ink-500">{label}</p>
      <p className="text-body-sm font-medium text-ink-900">{value}</p>
    </div>
  );
}

export default async function TripRequestPage({ params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("tripRequest");
  const { id } = await params;
  const session = await auth();
  if (!session?.user) {
    redirect("/trip");
  }

  const tripRequest = await bookingService.getById(id);
  if (!tripRequest) {
    notFound();
  }

  const isOwner = tripRequest.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const actingDriver = await prisma.driver.findUnique({ where: { userId: session.user.id }, select: { id: true } });
  const isAssignedDriver = actingDriver?.id === tripRequest.driverId;
  if (!isOwner && !isAssignedDriver && !isAdmin) {
    notFound();
  }

  const [raw, driver] = await Promise.all([
    prisma.tripRequest.findUnique({ where: { id }, select: { itinerarySnapshot: true } }),
    tripRequest.driverId ? driverService.getById(tripRequest.driverId) : Promise.resolve(null),
  ]);
  const snapshot = (raw?.itinerarySnapshot ?? null) as ItinerarySnapshot | null;
  const routeSummary =
    snapshot?.days.flatMap((d) => d.places.map((p) => p.name)).join(" → ") || t("noPlaces");

  return (
    <div className="pb-12">
      <BackHeader title={t("pageTitle")} backHref="/trip" />
      <div className="flex flex-col gap-4 px-5">
        <div className="flex items-center justify-between gap-2">
          <p className="text-h2 text-ink-900">{snapshot?.tripName ?? t("tripFallbackName")}</p>
          <Badge variant={STATUS_VARIANT[tripRequest.status] ?? "neutral"}>
            {t(STATUS_LABEL_KEYS[tripRequest.status])}
          </Badge>
        </div>

        <Card>
          <CardContent className="pt-4">
            <StatRow label={t("routeLabel")} value={routeSummary} />
            <StatRow label={t("datesLabel")} value={formatDateRange(tripRequest.startDate, tripRequest.endDate)} />
            <StatRow label={t("passengersLabel")} value={String(tripRequest.passengers)} />
            <StatRow label={t("distanceLabel")} value={formatDistanceMeters(tripRequest.distanceMeters)} />
            <StatRow label={t("drivingTimeLabel")} value={formatDuration(Math.round(tripRequest.durationSeconds / 60))} />
            <StatRow label={t("estimatedPriceLabel")} value={`${tripRequest.estimatedPriceGel.toLocaleString()} GEL`} />
            <StatRow label={t("driverLabel")} value={driver?.name ?? t("notSelected")} />
            {tripRequest.notes && <StatRow label={t("notesLabel")} value={tripRequest.notes} />}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
