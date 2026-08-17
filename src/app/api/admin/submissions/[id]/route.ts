import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { videoService } from "@/lib/services/impl/VideoService";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

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
      const { videoId } = await videoService.approveSubmission(id, session.user.id);
      return jsonOk({ videoId });
    }
    await videoService.rejectSubmission(id, session.user.id, parsed.data.reason);
    return jsonOk({ rejected: true });
  } catch (err) {
    return jsonError("CONFLICT", err instanceof Error ? err.message : t("couldNotProcessSubmission"), 409);
  }
}
