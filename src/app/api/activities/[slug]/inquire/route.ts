import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { activityService } from "@/lib/services/impl/ActivityService";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const bodySchema = z.object({
  contactName: z.string().trim().min(1).max(100),
  contactEmail: z.string().trim().email(),
  message: z.string().trim().max(500).optional(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToInquire"), 401);
  }

  const { slug } = await params;
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidInquiry"), 400, zodIssuesToFields(parsed.error.issues));
  }

  const activity = await prisma.activity.findUnique({ where: { slug }, select: { id: true } });
  if (!activity) {
    return jsonError("NOT_FOUND", t("activityNotFound"), 404);
  }

  const { inquiryId } = await activityService.submitInquiry({
    activityId: activity.id,
    userId: session.user.id,
    contactName: parsed.data.contactName,
    contactEmail: parsed.data.contactEmail,
    message: parsed.data.message,
  });

  return jsonOk({ inquiryId }, { status: 201 });
}
