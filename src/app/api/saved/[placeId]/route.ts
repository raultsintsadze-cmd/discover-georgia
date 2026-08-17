import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function DELETE(_request: Request, { params }: { params: Promise<{ placeId: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToManageSavedPlaces"), 401);
  }
  const { placeId } = await params;

  const existing = await prisma.savedPlace.findUnique({
    where: { userId_placeId: { userId: session.user.id, placeId } },
  });
  if (existing) {
    await prisma.savedPlace.delete({ where: { id: existing.id } });
    await prisma.place.update({ where: { id: placeId }, data: { saveCount: { decrement: 1 } } });
  }

  return jsonOk({ saved: false });
}
