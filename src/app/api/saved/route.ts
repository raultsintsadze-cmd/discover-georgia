import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";
import { analyticsProvider } from "@/lib/providers/analytics/console";

const bodySchema = z.object({ placeId: z.string().min(1) });

export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToViewSavedPlaces"), 401);
  }

  const saved = await prisma.savedPlace.findMany({
    where: { userId: session.user.id },
    include: { place: { include: { region: true, category: true } } },
    orderBy: { createdAt: "desc" },
  });

  return jsonOk(
    saved.map((s) => ({
      placeId: s.place.id,
      slug: s.place.slug,
      name: s.place.name,
      shortDescription: s.place.shortDescription,
      regionName: s.place.region.name,
      categoryName: s.place.category.name,
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

  const place = await prisma.place.findUnique({ where: { id: parsed.data.placeId }, select: { id: true } });
  if (!place) {
    return jsonError("NOT_FOUND", t("placeNotFound"), 404);
  }

  const existing = await prisma.savedPlace.findUnique({
    where: { userId_placeId: { userId: session.user.id, placeId: place.id } },
  });
  if (!existing) {
    await prisma.savedPlace.create({ data: { userId: session.user.id, placeId: place.id } });
    await prisma.place.update({ where: { id: place.id }, data: { saveCount: { increment: 1 } } });
    analyticsProvider.track({ name: "place_saved", placeId: place.id, userId: session.user.id });
  }

  return jsonOk({ saved: true }, { status: 201 });
}
