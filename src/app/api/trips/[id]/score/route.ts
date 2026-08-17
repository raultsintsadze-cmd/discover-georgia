import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { aiService } from "@/lib/services/impl/AIService";
import { jsonOk, jsonError, serviceErrorResponse } from "@/lib/api/response";

/** A recommendation, not a fact — see TripScore.notes and docs/ai-architecture.md. */
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToViewTrip"), 401);
  }
  const { id } = await params;

  try {
    const score = await aiService.getTripScore(id, session.user.id);
    return jsonOk(score);
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
