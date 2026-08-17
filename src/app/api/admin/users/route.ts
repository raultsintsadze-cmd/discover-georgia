import { getTranslations } from "next-intl/server";
import { requireAdminSession } from "@/lib/auth/guards";
import { prisma } from "@/lib/db/client";
import { jsonOk, jsonError } from "@/lib/api/response";

/**
 * No dedicated UserService exists (User is owned by Auth.js, not a domain
 * service) — a direct, read-only query here is the established exception,
 * same as the small supplementary lookups elsewhere (see e.g.
 * /api/trip-requests/[id]'s driver-ownership check).
 */
export async function GET() {
  const t = await getTranslations("apiErrors");
  const session = await requireAdminSession();
  if (!session) {
    return jsonError("FORBIDDEN", t("adminAccessRequired"), 403);
  }

  const users = await prisma.user.findMany({
    select: { id: true, name: true, email: true, role: true, createdAt: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  return jsonOk(users);
}
