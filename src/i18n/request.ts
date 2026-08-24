import { getRequestConfig } from "next-intl/server";
import { cookies, headers } from "next/headers";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { DEFAULT_LOCALE, LOCALE_COOKIE, isSupportedLocale, type Locale } from "./locales";

/**
 * No i18n routing (no /ka/ or /ru/ URL prefix — see docs/architecture.md
 * "Internationalization"). Resolution order: explicit cookie choice on this
 * device, then a signed-in user's saved preference (so it follows them to a
 * new device), then the browser's Accept-Language, then English.
 */
async function resolveLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const cookieLocale = cookieStore.get(LOCALE_COOKIE)?.value;
  if (isSupportedLocale(cookieLocale)) return cookieLocale;

  const session = await auth();
  if (session?.user?.id) {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { locale: true },
    });
    if (isSupportedLocale(user?.locale)) return user.locale;
  }

  const acceptLanguage = (await headers()).get("accept-language");
  if (acceptLanguage) {
    for (const part of acceptLanguage.split(",")) {
      const lang = part.split(";")[0]?.trim().slice(0, 2).toLowerCase();
      if (isSupportedLocale(lang)) return lang;
    }
  }

  return DEFAULT_LOCALE;
}

// One JSON file per feature area, per locale — see messages/en/*.json.
// Keeps each namespace independently editable/reviewable instead of one
// giant per-locale file.
const NAMESPACES = [
  "common",
  "nav",
  "meta",
  "discover",
  "map",
  "trip",
  "tripRequest",
  "saved",
  "profile",
  "place",
  "activity",
  "region",
  "category",
  "auth",
  "submit",
  "creators",
  "driver",
  "ai",
  "errors",
  "apiErrors",
] as const;

async function loadMessages(locale: Locale) {
  const modules = await Promise.all(
    NAMESPACES.map((ns) => import(`../../messages/${locale}/${ns}.json`).then((m) => m.default))
  );
  return Object.fromEntries(NAMESPACES.map((ns, i) => [ns, modules[i]]));
}

export default getRequestConfig(async () => {
  const locale = await resolveLocale();
  return {
    locale,
    messages: await loadMessages(locale),
  };
});
