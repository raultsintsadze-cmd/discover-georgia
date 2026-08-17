import { NextRequest } from "next/server";
import { z } from "zod";
import { getLocale, getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { aiService } from "@/lib/services/impl/AIService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";
import { DEFAULT_LOCALE, isSupportedLocale } from "@/i18n/locales";

const bodySchema = z.object({ text: z.string().trim().min(1).max(2000) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToUseAiAgent"), 401);
  }
  const { id: conversationId } = await params;

  // AIService.sendMessage trusts the conversation's own stored userId for
  // every tool call it makes — this ownership check is what stops one
  // user from riding another user's conversation (and its trip access).
  const conversation = await prisma.aiConversation.findUnique({
    where: { id: conversationId },
    select: { userId: true },
  });
  if (!conversation || conversation.userId !== session.user.id) {
    return jsonError("NOT_FOUND", t("conversationNotFound"), 404);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidMessage"), 400, zodIssuesToFields(parsed.error.issues));
  }

  try {
    const rawLocale = await getLocale();
    const locale = isSupportedLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
    const turn = await aiService.sendMessage(conversationId, parsed.data.text, locale);
    return jsonOk(turn);
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
