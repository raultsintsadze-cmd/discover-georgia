import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { restaurantService } from "@/lib/services/impl/RestaurantService";
import { jsonOk, jsonError, zodIssuesToFields, serviceErrorResponse } from "@/lib/api/response";

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200).optional(),
  nearPlaceId: z.string().min(1).optional(),
  cuisine: z.string().trim().max(50).optional(),
  description: z.string().trim().max(1000).optional(),
  rating: z.number().min(0).max(5).optional(),
  priceLevel: z.number().int().min(1).max(4).optional(),
  bookingUrl: z.string().url().optional(),
});

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const { id } = await params;

  const parsed = updateSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidRestaurantDetails"), 400, zodIssuesToFields(parsed.error.issues));
  }

  try {
    await restaurantService.updateRestaurant(id, parsed.data);
    return jsonOk({ updated: true });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }
  const { id } = await params;

  try {
    await restaurantService.deleteRestaurant(id);
    return jsonOk({ deleted: true });
  } catch (err) {
    return serviceErrorResponse(err);
  }
}
