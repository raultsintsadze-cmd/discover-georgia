"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Field } from "@/components/ui/Field";

interface ActivityOption {
  id: string;
  name: string;
}

export interface ActivityPickerProps {
  placeId: string | null;
  value: string | null;
  onChange: (activityId: string | null) => void;
}

/**
 * Optional "which activity is this about" picker for the video submission
 * form — scoped to whatever place was just picked via PlacePicker, so it
 * works for any place in the catalog, not one hardcoded activity/place.
 * Renders nothing when the place has no activities yet (most places,
 * today) rather than showing an empty/pointless picker.
 */
export function ActivityPicker({ placeId, value, onChange }: ActivityPickerProps) {
  const t = useTranslations("submit");
  const [options, setOptions] = React.useState<ActivityOption[]>([]);

  React.useEffect(() => {
    if (!placeId) {
      setOptions([]);
      return;
    }
    let cancelled = false;
    fetch(`/api/activities?place=${encodeURIComponent(placeId)}`)
      .then((res) => res.json())
      .then((body) => {
        if (!cancelled) setOptions(body.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setOptions([]);
      });
    return () => {
      cancelled = true;
    };
  }, [placeId]);

  // The parent resets `value` when the place changes (a new place's
  // activity list has nothing to do with the old selection) — this just
  // guards against the option list arriving a tick later than that reset.
  React.useEffect(() => {
    if (value && !options.some((o) => o.id === value)) onChange(null);
  }, [options, value, onChange]);

  if (options.length === 0) return null;

  return (
    <Field label={t("activityField")} helperText={t("activityHelper")}>
      {(fieldProps) => (
        <select
          {...fieldProps}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value || null)}
          className="h-touch w-full rounded-md border border-border bg-surface-1 px-3.5 text-body text-ink-900 focus-visible:border-accent-500"
        >
          <option value="">{t("activityNoneOption")}</option>
          {options.map((o) => (
            <option key={o.id} value={o.id}>
              {o.name}
            </option>
          ))}
        </select>
      )}
    </Field>
  );
}
