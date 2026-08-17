import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { tripService } from "@/lib/services/impl/TripService";
import { ScreenHeader } from "@/components/shell/ScreenHeader";
import { SignInPrompt } from "@/components/auth/SignInPrompt";
import { NoTripState } from "@/components/trip/NoTripState";
import { TripView } from "@/components/trip/TripView";

export default async function TripPage() {
  const session = await auth();
  const t = await getTranslations("trip");

  if (!session?.user) {
    return (
      <div className="mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-md flex-col">
        <ScreenHeader title={t("title")} subtitle={t("subtitle")} />
        <SignInPrompt message={t("signInPrompt")} />
      </div>
    );
  }

  const trips = await tripService.listTrips(session.user.id);
  const trip = trips[0] ?? null;

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-md flex-col">
      {trip ? (
        <TripView initialTrip={trip} />
      ) : (
        <>
          <ScreenHeader title={t("title")} subtitle={t("subtitle")} />
          <NoTripState />
        </>
      )}
    </div>
  );
}
