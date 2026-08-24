import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function DELETE(_request: Request, { params }: { params: Promise<{ activityId: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToManageSavedPlaces"), 401);
  }
  const { activityId } = await params;

  const existing = await prisma.savedActivity.findUnique({
    where: { userId_activityId: { userId: session.user.id, activityId } },
  });
  if (existing) {
    await prisma.savedActivity.delete({ where: { id: existing.id } });
  }

  return jsonOk({ saved: false });
}
