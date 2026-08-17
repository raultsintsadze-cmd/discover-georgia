"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { SUPPORTED_LOCALES, LOCALE_LABELS, type Locale } from "@/i18n/locales";
import { cn } from "@/lib/utils/cn";

export function LanguageSwitcher() {
  const t = useTranslations("profile");
  const locale = useLocale();
  const router = useRouter();
  const [pending, setPending] = React.useState<Locale | null>(null);

  async function selectLocale(next: Locale) {
    if (next === locale || pending) return;
    setPending(next);
    try {
      await fetch("/api/user/locale", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ locale: next }),
      });
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="w-full">
      <p className="mb-2 text-caption font-medium uppercase tracking-wide text-ink-500">{t("language")}</p>
      <div role="radiogroup" aria-label={t("language")} className="flex overflow-hidden rounded-md border border-border">
        {SUPPORTED_LOCALES.map((code) => {
          const active = code === locale;
          return (
            <button
              key={code}
              type="button"
              role="radio"
              aria-checked={active}
              disabled={pending !== null}
              onClick={() => selectLocale(code)}
              className={cn(
                "flex-1 py-2 text-body-sm transition-colors duration-fast ease-out",
                active ? "bg-accent-500 font-medium text-ink-onaccent" : "bg-surface-1 text-ink-700",
                pending !== null && !active && "opacity-60"
              )}
            >
              {LOCALE_LABELS[code]}
            </button>
          );
        })}
      </div>
    </div>
  );
}
