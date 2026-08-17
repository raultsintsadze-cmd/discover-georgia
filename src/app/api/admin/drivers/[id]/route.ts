import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { driverService } from "@/lib/services/impl/DriverService";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("verify") }),
  z.object({ action: z.literal("suspend"), reason: z.string().trim().min(1).max(500) }),
]);

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const { id } = await params;

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidRequest"), 400, zodIssuesToFields(parsed.error.issues));
  }

  if (parsed.data.action === "verify") {
    await driverService.verify(id, session.user.id);
  } else {
    await driverService.suspend(id, session.user.id, parsed.data.reason);
  }

  const driver = await driverService.getById(id);
  return jsonOk(driver);
}
