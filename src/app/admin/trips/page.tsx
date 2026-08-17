import Link from "next/link";
import { tripService } from "@/lib/services/impl/TripService";
import { bookingService } from "@/lib/services/impl/BookingService";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { formatDistanceMeters, formatDateRange } from "@/lib/utils/format";

const REQUEST_STATUS_VARIANT: Record<string, NonNullable<BadgeProps["variant"]>> = {
  PENDING: "warning",
  DRIVER_ACCEPTED: "accent",
  CONFIRMED: "accent",
  IN_PROGRESS: "accent",
  COMPLETED: "success",
  CANCELLED: "danger",
};

export default async function AdminTripsPage() {
  const [trips, tripRequests] = await Promise.all([tripService.adminList(), bookingService.adminList()]);

  return (
    <div className="flex flex-col gap-8">
      <section>
        <p className="mb-2 text-h3 text-ink-900">Trip requests</p>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {tripRequests.length === 0 && <p className="p-3 text-body-sm text-ink-500">No trip requests yet.</p>}
          {tripRequests.map((r) => (
            <Link key={r.id} href={`/trip-requests/${r.id}`} className="flex items-center justify-between gap-3 p-3 hover:bg-surface-2">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <p className="truncate text-body-sm font-medium text-ink-900">Trip #{r.id.slice(-8).toUpperCase()}</p>
                  <Badge variant={REQUEST_STATUS_VARIANT[r.status] ?? "neutral"}>{r.status.replaceAll("_", " ")}</Badge>
                </div>
                <p className="truncate text-caption text-ink-500">
                  {formatDateRange(r.startDate, r.endDate)} · {r.passengers} passenger{r.passengers === 1 ? "" : "s"} ·{" "}
                  {formatDistanceMeters(r.distanceMeters)}
                </p>
              </div>
              <p className="shrink-0 text-body-sm font-medium text-ink-900">{r.estimatedPriceGel.toLocaleString()} GEL</p>
            </Link>
          ))}
        </div>
      </section>

      <section>
        <p className="mb-2 text-h3 text-ink-900">All trips</p>
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {trips.length === 0 && <p className="p-3 text-body-sm text-ink-500">No trips yet.</p>}
          {trips.map((t) => (
            <div key={t.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-body-sm font-medium text-ink-900">{t.name}</p>
                <p className="truncate text-caption text-ink-500">
                  {t.ownerEmail ?? "Unknown owner"} · {formatDateRange(t.startDate, t.endDate)} · {t.placeCount} place
                  {t.placeCount === 1 ? "" : "s"}
                </p>
              </div>
              <Badge variant="neutral">{t.status}</Badge>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
