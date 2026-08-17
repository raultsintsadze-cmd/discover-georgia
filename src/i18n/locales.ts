export const LOCALE_COOKIE = "NEXT_LOCALE";

export const SUPPORTED_LOCALES = ["en", "ka", "ru"] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  ka: "ქართული",
  ru: "Русский",
};

export function isSupportedLocale(value: string | null | undefined): value is Locale {
  return !!value && (SUPPORTED_LOCALES as readonly string[]).includes(value);
}
