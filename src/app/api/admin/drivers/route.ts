import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { driverService } from "@/lib/services/impl/DriverService";
import { jsonOk, jsonError } from "@/lib/api/response";

/** Every driver regardless of status — the admin roster. The public /api/drivers only shows bookable ones. */
export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const drivers = await driverService.listAll();
  return jsonOk(drivers);
}
