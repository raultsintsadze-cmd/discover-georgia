import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/client";
import { restaurantService } from "@/lib/services/impl/RestaurantService";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const t = await getTranslations("apiErrors");
  const { slug } = await params;
  const place = await prisma.place.findUnique({ where: { slug }, select: { id: true } });
  if (!place) {
    return jsonError("NOT_FOUND", t("placeNotFoundForSlug", { slug }), 404);
  }

  const restaurants = await restaurantService.listNearPlace(place.id);
  return jsonOk(restaurants);
}
