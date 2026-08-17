import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { aiService } from "@/lib/services/impl/AIService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";

const bodySchema = z.object({ tripId: z.string().min(1).optional() });

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToUseAiAgent"), 401);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => ({})));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidRequest"), 400, zodIssuesToFields(parsed.error.issues));
  }

  try {
    const result = await aiService.startConversation(session.user.id, parsed.data.tripId);
    return jsonOk(result, { status: 201 });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
