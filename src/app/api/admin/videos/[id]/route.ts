import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { videoService } from "@/lib/services/impl/VideoService";
import { jsonOk, jsonError, serviceErrorResponse } from "@/lib/api/response";

/** Sets this video as its place's featured video — the only Videos admin action (spec §40). */
export async function PATCH(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const { id } = await params;

  const video = await prisma.video.findUnique({ where: { id }, select: { placeId: true } });
  if (!video) {
    return jsonError("NOT_FOUND", t("videoNotFound"), 404);
  }

  try {
    await videoService.setFeatured(video.placeId, id);
    return jsonOk({ featured: true });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
