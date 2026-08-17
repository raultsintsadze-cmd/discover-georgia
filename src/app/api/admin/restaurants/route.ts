import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { restaurantService } from "@/lib/services/impl/RestaurantService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";

const createSchema = z.object({
  name: z.string().trim().min(1).max(200),
  nearPlaceId: z.string().min(1),
  cuisine: z.string().trim().max(50).optional(),
  description: z.string().trim().max(1000).optional(),
  rating: z.number().min(0).max(5).optional(),
  priceLevel: z.number().int().min(1).max(4).optional(),
  bookingUrl: z.string().url().optional(),
});

export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const restaurants = await restaurantService.adminList();
  return jsonOk(restaurants);
}

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }

  const parsed = createSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidRestaurantDetails"), 400, zodIssuesToFields(parsed.error.issues));
  }

  try {
    const restaurant = await restaurantService.createRestaurant(parsed.data);
    return jsonOk(restaurant, { status: 201 });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
