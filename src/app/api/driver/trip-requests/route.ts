import { getTranslations } from "next-intl/server";
import { requireDriverSession } from "@/lib/auth/guards";
import { bookingService } from "@/lib/services/impl/BookingService";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET() {
  const t = await getTranslations("apiErrors");
  const driverSession = await requireDriverSession();
  if (!driverSession) {
    return jsonError("UNAUTHENTICATED", t("signInAsDriverToViewTripRequests"), 401);
  }

  const tripRequests = await bookingService.listForDriver(driverSession.driverId);
  return jsonOk(tripRequests);
}
