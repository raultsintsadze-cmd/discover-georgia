import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { videoService } from "@/lib/services/impl/VideoService";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const videos = await videoService.listRecent();
  return jsonOk(videos);
}
