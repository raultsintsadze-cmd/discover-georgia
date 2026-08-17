import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { bookingService } from "@/lib/services/impl/BookingService";
import { jsonOk, jsonError } from "@/lib/api/response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToViewTripRequest"), 401);
  }
  const { id } = await params;

  const tripRequest = await bookingService.getById(id);
  if (!tripRequest) {
    return jsonError("NOT_FOUND", t("tripRequestNotFound"), 404);
  }

  const isOwner = tripRequest.userId === session.user.id;
  const isAdmin = session.user.role === "ADMIN";
  const isAssignedDriver = tripRequest.driverId
    ? (await prisma.driver.findUnique({ where: { userId: session.user.id }, select: { id: true } }))?.id ===
      tripRequest.driverId
    : false;

  if (!isOwner && !isAssignedDriver && !isAdmin) {
    return jsonError("FORBIDDEN", t("noAccessToTripRequest"), 403);
  }

  return jsonOk(tripRequest);
}
