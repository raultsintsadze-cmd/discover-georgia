import Link from "next/link";
import { prisma } from "@/lib/db/client";
import { Card, CardContent } from "@/components/ui/Card";

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link href={href}>
      <Card className="transition-colors hover:bg-surface-2">
        <CardContent className="pt-4">
          <p className="text-h1 text-ink-900">{value.toLocaleString()}</p>
          <p className="text-body-sm text-ink-500">{label}</p>
        </CardContent>
      </Card>
    </Link>
  );
}

export default async function AdminDashboardPage() {
  const [
    placeCount,
    pendingSubmissions,
    pendingCreators,
    pendingDrivers,
    driverCount,
    userCount,
    tripCount,
    pendingTripRequests,
  ] = await Promise.all([
    prisma.place.count(),
    prisma.videoSubmission.count({ where: { status: "PENDING" } }),
    prisma.creator.count({ where: { status: "PENDING" } }),
    prisma.driver.count({ where: { verificationStatus: "PENDING" } }),
    prisma.driver.count(),
    prisma.user.count(),
    prisma.trip.count(),
    prisma.tripRequest.count({ where: { status: "PENDING" } }),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-ink-500">Overview across the whole catalog and community — tap a card to manage it.</p>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Published places" value={placeCount} href="/admin/places" />
        <StatCard label="Pending video submissions" value={pendingSubmissions} href="/admin/submissions" />
        <StatCard label="Pending creator applications" value={pendingCreators} href="/admin/creators" />
        <StatCard label="Drivers awaiting verification" value={pendingDrivers} href="/admin/drivers" />
        <StatCard label="Total drivers" value={driverCount} href="/admin/drivers" />
        <StatCard label="Registered users" value={userCount} href="/admin/users" />
        <StatCard label="Trips planned" value={tripCount} href="/admin/trips" />
        <StatCard label="Pending trip requests" value={pendingTripRequests} href="/admin/trips" />
      </div>
    </div>
  );
}
