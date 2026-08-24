import { getTranslations } from "next-intl/server";
import { activityService } from "@/lib/services/impl/ActivityService";
import { jsonCached, jsonError } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const t = await getTranslations("apiErrors");
  const { slug } = await params;

  const activity = await activityService.getBySlug(slug);
  if (!activity) {
    return jsonError("NOT_FOUND", t("activityNotFound"), 404);
  }

  return jsonCached(activity, 60);
}
