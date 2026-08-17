import { getTranslations } from "next-intl/server";
import { placeService } from "@/lib/services/impl/PlaceService";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const t = await getTranslations("apiErrors");
  const { slug } = await params;
  const place = await placeService.getBySlug(slug);
  if (!place) {
    return jsonError("NOT_FOUND", t("placeNotFoundForSlug", { slug }), 404);
  }
  await placeService.incrementView(place.id);
  return jsonOk(place);
}
