"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/Input";
import type { PlaceSummary } from "@/lib/services/place.service";

export interface PlacePickerProps {
  value: PlaceSummary | null;
  onChange: (place: PlaceSummary | null) => void;
}

// Browse mode (empty query) fetches this many, grouped by region — plenty
// of headroom over today's catalog while staying a reasonable scroll.
// Search mode (2+ chars) keeps the tighter, flat 8-result list it always
// had — typing is already the more precise tool, it doesn't need grouping.
const BROWSE_PAGE_SIZE = 60;
const SEARCH_PAGE_SIZE = 8;

/** Debounced search-and-select over the real places catalog — used by both video submission and trip building. */
export function PlacePicker({ value, onChange }: PlacePickerProps) {
  const t = useTranslations("place");
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<PlaceSummary[]>([]);
  const [open, setOpen] = React.useState(false);
  const containerRef = React.useRef<HTMLDivElement>(null);

  const browsing = query.trim().length === 0;

  React.useEffect(() => {
    if (!open) return;

    if (browsing) {
      // Not debounced — this isn't keystroke-driven, it fires once as
      // soon as the field is focused with nothing typed yet.
      let cancelled = false;
      fetch(`/api/places?pageSize=${BROWSE_PAGE_SIZE}`)
        .then((res) => res.json().then((body) => ({ res, body })))
        .then(({ res, body }) => {
          if (!cancelled && res.ok) setResults(body.data);
        });
      return () => {
        cancelled = true;
      };
    }

    if (query.trim().length < 2) {
      setResults([]);
      return;
    }

    const handle = setTimeout(async () => {
      const res = await fetch(`/api/places?q=${encodeURIComponent(query)}&pageSize=${SEARCH_PAGE_SIZE}`);
      const body = await res.json();
      if (res.ok) setResults(body.data);
    }, 250);
    return () => clearTimeout(handle);
  }, [query, open, browsing]);

  React.useEffect(() => {
    if (!open) return;
    function handlePointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [open]);

  const groupedByRegion = React.useMemo(() => {
    const groups = new Map<string, PlaceSummary[]>();
    for (const place of results) {
      const key = place.regionName;
      const group = groups.get(key);
      if (group) group.push(place);
      else groups.set(key, [place]);
    }
    return [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [results]);

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

  function selectPlace(place: PlaceSummary) {
    onChange(place);
    setOpen(false);
  }

  return (
    <div ref={containerRef} className="relative">
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
        <ul className="absolute z-10 mt-1 max-h-72 w-full overflow-y-auto rounded-md border border-border bg-surface-1 shadow-md">
          {browsing
            ? groupedByRegion.map(([regionName, places]) => (
                <li key={regionName}>
                  <p className="sticky top-0 bg-surface-1 px-3.5 pb-1 pt-2 text-caption font-medium uppercase tracking-wide text-ink-500">
                    {regionName}
                  </p>
                  <ul>
                    {places.map((place) => (
                      <li key={place.id}>
                        <button
                          type="button"
                          className="w-full px-3.5 py-2.5 text-left hover:bg-surface-2"
                          onClick={() => selectPlace(place)}
                        >
                          <p className="text-body-sm font-medium text-ink-900">{place.name}</p>
                          <p className="text-caption text-ink-500">{place.categoryName}</p>
                        </button>
                      </li>
                    ))}
                  </ul>
                </li>
              ))
            : results.map((place) => (
                <li key={place.id}>
                  <button
                    type="button"
                    className="w-full px-3.5 py-2.5 text-left hover:bg-surface-2"
                    onClick={() => selectPlace(place)}
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
