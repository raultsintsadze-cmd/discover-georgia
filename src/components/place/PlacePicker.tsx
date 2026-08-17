"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import type { PlaceSummary } from "@/lib/services/place.service";

export interface PlacePickerProps {
  value: PlaceSummary | null;
  onChange: (place: PlaceSummary | null) => void;
}

/** Debounced search-and-select over the real places catalog — used by both video submission and trip building. */
export function PlacePicker({ value, onChange }: PlacePickerProps) {
  const t = useTranslations("place");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<PlaceSummary[]>([]);
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const handle = setTimeout(async () => {
      const res = await fetch(`/api/places?q=${encodeURIComponent(query)}&pageSize=8`);
      const body = await res.json();
      if (res.ok) setResults(body.data);
    }, 250);
    return () => clearTimeout(handle);
  }, [query]);

  if (value) {
    return (
      <div className="flex h-touch items-center justify-between rounded-md border border-border bg-surface-1 px-3.5">
        <div className="min-w-0">
          <p className="truncate text-body-sm font-medium text-ink-900">{value.name}</p>
          <p className="truncate text-caption text-ink-500">{value.regionName}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setQuery("");
          }}
          className="shrink-0 text-body-sm text-accent-600"
        >
          {t("picker.change")}
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <Input
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        placeholder={t("picker.searchPlaceholder")}
      />
      {open && results.length > 0 && (
        <ul className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-border bg-surface-1 shadow-md">
          {results.map((place) => (
            <li key={place.id}>
              <button
                type="button"
                className="w-full px-3.5 py-2.5 text-left hover:bg-surface-2"
                onClick={() => {
                  onChange(place);
                  setOpen(false);
                }}
              >
                <p className="text-body-sm font-medium text-ink-900">{place.name}</p>
                <p className="text-caption text-ink-500">{place.regionName}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
