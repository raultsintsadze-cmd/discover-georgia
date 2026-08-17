import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { jsonOk, jsonError } from "@/lib/api/response";

/**
 * Support/debugging tool (spec §40 "AI Activity"): recent conversations
 * with their full tool-call audit trail (role/toolName/toolInput/
 * toolOutput per message) — the same data the "never fabricate" guardrail
 * relies on, made visible for verifying it in practice.
 */
export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }

  const conversations = await prisma.aiConversation.findMany({
    include: {
      user: { select: { name: true, email: true } },
      trip: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" } },
    },
    orderBy: { updatedAt: "desc" },
    take: 30,
  });

  return jsonOk(
    conversations.map((c) => ({
      id: c.id,
      userLabel: c.user.name ?? c.user.email ?? c.userId,
      tripName: c.trip?.name ?? null,
      messageCount: c.messages.length,
      updatedAt: c.updatedAt,
      messages: c.messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        toolName: m.toolName,
        toolInput: m.toolInput,
        toolOutput: m.toolOutput,
        createdAt: m.createdAt,
      })),
    }))
  );
}
