import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { bookingService } from "@/lib/services/impl/BookingService";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToViewTripRequests"), 401);
  }

  const tripRequests = await bookingService.listForUser(session.user.id);
  return jsonOk(tripRequests);
}
