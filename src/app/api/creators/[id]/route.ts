import { getTranslations } from "next-intl/server";
import { creatorService } from "@/lib/services/impl/CreatorService";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const { id } = await params;
  const profile = await creatorService.getProfile(id);
  if (!profile) {
    return jsonError("NOT_FOUND", t("creatorNotFound"), 404);
  }
  return jsonOk(profile);
}
