import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const bodySchema = z.object({ activityId: z.string().min(1) });

export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToViewSavedPlaces"), 401);
  }

  const saved = await prisma.savedActivity.findMany({
    where: { userId: session.user.id },
    include: { activity: true },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk(
    saved.map((s) => ({
      activityId: s.activity.id,
      slug: s.activity.slug,
      name: s.activity.name,
      category: s.activity.category,
      savedAt: s.createdAt,
    }))
  );
}

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToSavePlaces"), 401);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidRequest"), 400, zodIssuesToFields(parsed.error.issues));
  }

  const activity = await prisma.activity.findUnique({ where: { id: parsed.data.activityId }, select: { id: true } });
  if (!activity) {
    return jsonError("NOT_FOUND", t("activityNotFound"), 404);
  }

  const existing = await prisma.savedActivity.findUnique({
    where: { userId_activityId: { userId: session.user.id, activityId: activity.id } },
  });
  if (!existing) {
    await prisma.savedActivity.create({ data: { userId: session.user.id, activityId: activity.id } });
  }

  return jsonOk({ saved: true }, { status: 201 });
}
