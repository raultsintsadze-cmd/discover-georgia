import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { requireDriverSession } from "@/lib/auth/guards";
import { BackHeader } from "@/components/shell/BackHeader";
import { DriverTripRequestList } from "@/components/driver/DriverTripRequestList";

export default async function DriverTripRequestsPage() {
  const driverSession = await requireDriverSession();
  if (!driverSession) {
    redirect("/");
  }

  const t = await getTranslations("driver");

  return (
    <div className="pb-12">
      <BackHeader title={t("pageTitle")} backHref="/" />
      <DriverTripRequestList />
    </div>
  );
}
