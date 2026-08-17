import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { bookingService } from "@/lib/services/impl/BookingService";
import { jsonOk, jsonError } from "@/lib/api/response";

/** Not in the original docs/api.md table — added alongside /api/admin/trips to satisfy spec §40's "view trip requests" admin action. */
export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const tripRequests = await bookingService.adminList();
  return jsonOk(tripRequests);
}
