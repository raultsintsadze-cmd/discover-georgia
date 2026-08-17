import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { tripService } from "@/lib/services/impl/TripService";
import { BackHeader } from "@/components/shell/BackHeader";
import { AIChatView } from "@/components/ai/AIChatView";

export default async function TripAIPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/trip");
  }

  const trips = await tripService.listTrips(session.user.id);
  const trip = trips[0];
  if (!trip) {
    redirect("/trip");
  }

  const t = await getTranslations("ai");

  return (
    <div className="flex h-dvh flex-col">
      <BackHeader title={t("pageTitle")} backHref="/trip" />
      <AIChatView tripId={trip.id} />
    </div>
  );
}
