import { getTranslations } from "next-intl/server";
import { driverService } from "@/lib/services/impl/DriverService";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const { id } = await params;
  const driver = await driverService.getById(id);
  if (!driver) {
    return jsonError("NOT_FOUND", t("driverNotFound"), 404);
  }
  return jsonOk(driver);
}
