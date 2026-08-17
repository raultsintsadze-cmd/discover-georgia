"use client";

import * as React from "react";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

const SELECT_CLASS =
  "h-touch w-full rounded-md border border-border bg-surface-1 px-3.5 text-body text-ink-900 focus-visible:border-accent-500";

export interface AdminPlaceFormValues {
  name: string;
  shortDescription: string;
  description: string;
  regionSlug: string;
  categorySlug: string;
  latitude: string;
  longitude: string;
  bestSeason: string;
  recommendedDuration: string;
  difficulty: "" | "EASY" | "MODERATE" | "HARD";
  entranceFee: string;
  parking: boolean;
  familyFriendly: boolean;
  tags: string;
  status: "DRAFT" | "PUBLISHED" | "ARCHIVED";
}

export const EMPTY_PLACE_FORM: AdminPlaceFormValues = {
  name: "",
  shortDescription: "",
  description: "",
  regionSlug: "",
  categorySlug: "",
  latitude: "",
  longitude: "",
  bestSeason: "",
  recommendedDuration: "",
  difficulty: "",
  entranceFee: "",
  parking: false,
  familyFriendly: false,
  tags: "",
  status: "DRAFT",
};

export function AdminPlaceForm({
  initial,
  onSubmit,
  submitLabel,
}: {
  initial: AdminPlaceFormValues;
  onSubmit: (payload: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>;
  submitLabel: string;
}) {
  const { toast } = useToast();
  const [values, setValues] = React.useState(initial);
  const [regions, setRegions] = React.useState<{ slug: string; name: string }[]>([]);
  const [categories, setCategories] = React.useState<{ slug: string; name: string }[]>([]);
  const [submitting, setSubmitting] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/regions").then((r) => r.json()).then((b) => setRegions(b.data ?? []));
    fetch("/api/categories").then((r) => r.json()).then((b) => setCategories(b.data ?? []));
  }, []);

  function set<K extends keyof AdminPlaceFormValues>(key: K, value: AdminPlaceFormValues[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const latitude = Number(values.latitude);
    const longitude = Number(values.longitude);
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      toast({ title: "Enter valid coordinates", variant: "danger" });
      return;
    }

    setSubmitting(true);
    try {
      const result = await onSubmit({
        name: values.name,
        shortDescription: values.shortDescription,
        description: values.description,
        regionSlug: values.regionSlug || undefined,
        categorySlug: values.categorySlug || undefined,
        latitude,
        longitude,
        bestSeason: values.bestSeason || undefined,
        recommendedDuration: values.recommendedDuration ? Number(values.recommendedDuration) : undefined,
        difficulty: values.difficulty || undefined,
        entranceFee: values.entranceFee || undefined,
        parking: values.parking,
        familyFriendly: values.familyFriendly,
        tags: values.tags
          .split(",")
          .map((t) => t.trim())
          .filter(Boolean),
        status: values.status,
      });
      if (!result.ok) {
        toast({ title: "Couldn't save this place", description: result.message, variant: "danger" });
        return;
      }
      toast({ title: "Saved", variant: "success" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-3 overflow-y-auto pr-1">
      <Field label="Name" required>
        {(f) => <Input {...f} value={values.name} onChange={(e) => set("name", e.target.value)} required />}
      </Field>
      <Field label="Short description" required>
        {(f) => (
          <Input
            {...f}
            value={values.shortDescription}
            onChange={(e) => set("shortDescription", e.target.value)}
            required
          />
        )}
      </Field>
      <Field label="Description" required>
        {(f) => (
          <Textarea {...f} value={values.description} onChange={(e) => set("description", e.target.value)} required />
        )}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Region" required>
          {(f) => (
            <select
              {...f}
              className={SELECT_CLASS}
              value={values.regionSlug}
              onChange={(e) => set("regionSlug", e.target.value)}
              required
            >
              <option value="">Select...</option>
              {regions.map((r) => (
                <option key={r.slug} value={r.slug}>
                  {r.name}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field label="Category" required>
          {(f) => (
            <select
              {...f}
              className={SELECT_CLASS}
              value={values.categorySlug}
              onChange={(e) => set("categorySlug", e.target.value)}
              required
            >
              <option value="">Select...</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name}
                </option>
              ))}
            </select>
          )}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Latitude" required>
          {(f) => (
            <Input
              {...f}
              type="number"
              step="any"
              value={values.latitude}
              onChange={(e) => set("latitude", e.target.value)}
              required
            />
          )}
        </Field>
        <Field label="Longitude" required>
          {(f) => (
            <Input
              {...f}
              type="number"
              step="any"
              value={values.longitude}
              onChange={(e) => set("longitude", e.target.value)}
              required
            />
          )}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Best season">
          {(f) => <Input {...f} value={values.bestSeason} onChange={(e) => set("bestSeason", e.target.value)} />}
        </Field>
        <Field label="Duration (minutes)">
          {(f) => (
            <Input
              {...f}
              type="number"
              min={0}
              value={values.recommendedDuration}
              onChange={(e) => set("recommendedDuration", e.target.value)}
            />
          )}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Difficulty">
          {(f) => (
            <select
              {...f}
              className={SELECT_CLASS}
              value={values.difficulty}
              onChange={(e) => set("difficulty", e.target.value as AdminPlaceFormValues["difficulty"])}
            >
              <option value="">Not set</option>
              <option value="EASY">Easy</option>
              <option value="MODERATE">Moderate</option>
              <option value="HARD">Hard</option>
            </select>
          )}
        </Field>
        <Field label="Status" required>
          {(f) => (
            <select
              {...f}
              className={SELECT_CLASS}
              value={values.status}
              onChange={(e) => set("status", e.target.value as AdminPlaceFormValues["status"])}
            >
              <option value="DRAFT">Draft</option>
              <option value="PUBLISHED">Published</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          )}
        </Field>
      </div>
      <Field label="Entrance fee">
        {(f) => <Input {...f} value={values.entranceFee} onChange={(e) => set("entranceFee", e.target.value)} />}
      </Field>
      <Field label="Tags" helperText="Comma-separated">
        {(f) => <Input {...f} value={values.tags} onChange={(e) => set("tags", e.target.value)} />}
      </Field>
      <div className="flex gap-4">
        <label className="flex items-center gap-2 text-body-sm text-ink-900">
          <input type="checkbox" checked={values.parking} onChange={(e) => set("parking", e.target.checked)} />
          Parking
        </label>
        <label className="flex items-center gap-2 text-body-sm text-ink-900">
          <input
            type="checkbox"
            checked={values.familyFriendly}
            onChange={(e) => set("familyFriendly", e.target.checked)}
          />
          Family friendly
        </label>
      </div>
      <Button type="submit" loading={submitting} className="mt-2">
        {submitLabel}
      </Button>
    </form>
  );
}
