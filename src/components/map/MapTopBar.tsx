"use client";

import { useTranslations } from "next-intl";
import { Search, LocateFixed } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export interface MapTopBarProps {
  query: string;
  onQueryChange: (query: string) => void;
  categories: { slug: string; name: string }[];
  activeCategory: string | null;
  onCategoryChange: (slug: string | null) => void;
  onLocateClick: () => void;
  locating: boolean;
}

export function MapTopBar({
  query,
  onQueryChange,
  categories,
  activeCategory,
  onCategoryChange,
  onLocateClick,
  locating,
}: MapTopBarProps) {
  const t = useTranslations("map");
  return (
    <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-2.5 bg-gradient-to-b from-surface-0 via-surface-0/90 to-transparent pb-6 pt-safe">
      <div className="flex items-center gap-2 px-4 pt-3">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-500" aria-hidden="true" />
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder={t("searchPlaceholder")}
            aria-label={t("searchAriaLabel")}
            className="h-touch w-full rounded-full border border-border bg-surface-1 pl-10 pr-3.5 text-body text-ink-900 shadow-sm placeholder:text-ink-500 focus-visible:border-accent-500"
          />
        </div>
        <button
          type="button"
          onClick={onLocateClick}
          disabled={locating}
          aria-label={t("useMyLocation")}
          className="flex h-touch w-touch shrink-0 items-center justify-center rounded-full border border-border bg-surface-1 text-ink-700 shadow-sm disabled:opacity-50"
        >
          <LocateFixed className={cn("h-5 w-5", locating && "animate-pulse")} aria-hidden="true" />
        </button>
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto px-4">
        <button
          type="button"
          onClick={() => onCategoryChange(null)}
          className={cn(
            "shrink-0 rounded-full px-3.5 py-2 text-body-sm font-medium transition-colors duration-fast",
            activeCategory === null ? "bg-accent-500 text-ink-onaccent" : "bg-surface-1 text-ink-700 shadow-sm"
          )}
        >
          {t("allCategories")}
        </button>
        {categories.map((category) => (
          <button
            key={category.slug}
            type="button"
            onClick={() => onCategoryChange(category.slug)}
            className={cn(
              "shrink-0 rounded-full px-3.5 py-2 text-body-sm font-medium transition-colors duration-fast",
              activeCategory === category.slug
                ? "bg-accent-500 text-ink-onaccent"
                : "bg-surface-1 text-ink-700 shadow-sm"
            )}
          >
            {category.name}
          </button>
        ))}
      </div>
    </div>
  );
}
