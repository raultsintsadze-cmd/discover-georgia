import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { tripService } from "@/lib/services/impl/TripService";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const trips = await tripService.adminList();
  return jsonOk(trips);
}
