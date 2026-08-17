import type { Locale } from "@/i18n/locales";

/**
 * Picks the locale-suffixed value for translatable database content
 * (Place/Region/Category — see docs/architecture.md "Internationalization")
 * when present, falling back to the English base field otherwise. The
 * ka/ru columns are nullable and unpopulated until a dedicated
 * content-translation pass, so this currently always resolves to `base`.
 */
export function localize(base: string, ka: string | null | undefined, ru: string | null | undefined, locale: Locale): string {
  if (locale === "ka" && ka) return ka;
  if (locale === "ru" && ru) return ru;
  return base;
}
