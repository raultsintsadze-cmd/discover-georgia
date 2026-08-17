import { NextRequest } from "next/server";
import { z } from "zod";
import { cookies } from "next/headers";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { jsonOk, jsonError } from "@/lib/api/response";
import { SUPPORTED_LOCALES, LOCALE_COOKIE } from "@/i18n/locales";

const bodySchema = z.object({ locale: z.enum(SUPPORTED_LOCALES) });

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidLocale"), 400);
  }

  const { locale } = parsed.data;
  const cookieStore = await cookies();
  cookieStore.set(LOCALE_COOKIE, locale, {
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
  });

  const session = await auth();
  if (session?.user?.id) {
    // updateMany (not update) so a stale JWT session referencing a
    // since-deleted user degrades to a no-op instead of a 500 — the
    // cookie above is already the primary mechanism, DB persistence is
    // just a best-effort cross-device convenience for signed-in users.
    await prisma.user.updateMany({ where: { id: session.user.id }, data: { locale } });
  }

  return jsonOk({ locale });
}
