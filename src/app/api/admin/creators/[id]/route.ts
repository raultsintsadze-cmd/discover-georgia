import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { creatorService } from "@/lib/services/impl/CreatorService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";

const bodySchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve") }),
  z.object({ action: z.literal("reject"), reason: z.string().trim().min(1).max(500) }),
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
    return jsonError("VALIDATION_ERROR", t("invalidModerationAction"), 400, zodIssuesToFields(parsed.error.issues));
  }

  try {
    if (parsed.data.action === "approve") {
      await creatorService.approve(id, session.user.id);
    } else {
      await creatorService.reject(id, session.user.id, parsed.data.reason);
    }
    return jsonOk({ id });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
