"use client";

import * as React from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Modal, ModalTrigger, ModalContent } from "@/components/ui/Modal";
import { PlacePicker } from "@/components/place/PlacePicker";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";
import type { PlaceSummary } from "@/lib/services/place.service";
import type { RestaurantDTO } from "@/lib/services/restaurant.service";

interface FormState {
  name: string;
  place: PlaceSummary | null;
  cuisine: string;
  description: string;
  rating: string;
  priceLevel: string;
  bookingUrl: string;
}

const EMPTY: FormState = { name: "", place: null, cuisine: "", description: "", rating: "", priceLevel: "", bookingUrl: "" };

function RestaurantForm({ initial, onSubmit, submitLabel }: { initial: FormState; onSubmit: (payload: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>; submitLabel: string }) {
  const { toast } = useToast();
  const [values, setValues] = React.useState(initial);
  const [submitting, setSubmitting] = React.useState(false);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!values.place) {
      toast({ title: "Pick a place", variant: "danger" });
      return;
    }
    setSubmitting(true);
    try {
      const result = await onSubmit({
        name: values.name,
        nearPlaceId: values.place.id,
        cuisine: values.cuisine || undefined,
        description: values.description || undefined,
        rating: values.rating ? Number(values.rating) : undefined,
        priceLevel: values.priceLevel ? Number(values.priceLevel) : undefined,
        bookingUrl: values.bookingUrl || undefined,
      });
      if (!result.ok) {
        toast({ title: "Couldn't save", description: result.message, variant: "danger" });
        return;
      }
      toast({ title: "Saved", variant: "success" });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <Field label="Name" required>
        {(f) => <Input {...f} value={values.name} onChange={(e) => set("name", e.target.value)} required />}
      </Field>
      <Field label="Near place" required>
        {() => <PlacePicker value={values.place} onChange={(p) => set("place", p)} />}
      </Field>
      <Field label="Cuisine">
        {(f) => <Input {...f} value={values.cuisine} onChange={(e) => set("cuisine", e.target.value)} />}
      </Field>
      <Field label="Description">
        {(f) => <Textarea {...f} value={values.description} onChange={(e) => set("description", e.target.value)} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Rating (0-5)">
          {(f) => <Input {...f} type="number" min={0} max={5} step="0.1" value={values.rating} onChange={(e) => set("rating", e.target.value)} />}
        </Field>
        <Field label="Price level (1-4)">
          {(f) => <Input {...f} type="number" min={1} max={4} value={values.priceLevel} onChange={(e) => set("priceLevel", e.target.value)} />}
        </Field>
      </div>
      <Field label="Booking URL">
        {(f) => <Input {...f} type="url" value={values.bookingUrl} onChange={(e) => set("bookingUrl", e.target.value)} />}
      </Field>
      <Button type="submit" loading={submitting} className="mt-2">
        {submitLabel}
      </Button>
    </form>
  );
}

export function AdminRestaurantsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [restaurants, setRestaurants] = React.useState<RestaurantDTO[]>([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/admin/restaurants")
      .then((r) => r.json())
      .then((b) => setRestaurants(b.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`/api/admin/restaurants/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      toast({ title: "Couldn't delete", description: body?.error?.message, variant: "danger" });
      return;
    }
    toast({ title: "Deleted", variant: "success" });
    load();
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <Modal open={createOpen} onOpenChange={setCreateOpen}>
        <ModalTrigger asChild>
          <Button size="sm" className="self-start">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New restaurant
          </Button>
        </ModalTrigger>
        <ModalContent title="New restaurant">
          <RestaurantForm
            initial={EMPTY}
            submitLabel="Create restaurant"
            onSubmit={async (payload) => {
              const res = await fetch("/api/admin/restaurants", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const body = await res.json();
              if (res.ok) {
                setCreateOpen(false);
                load();
              }
              return { ok: res.ok, message: body?.error?.message };
            }}
          />
        </ModalContent>
      </Modal>

      {restaurants.length === 0 ? (
        <EmptyState title="No restaurants yet" description="Add the first one above." />
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {restaurants.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-body-sm font-medium text-ink-900">{r.name}</p>
                <p className="truncate text-caption text-ink-500">
                  {r.cuisine ?? "Restaurant"} · {r.rating != null ? `${r.rating.toFixed(1)}★` : "Not rated"} ·{" "}
                  {r.priceLevel != null ? "$".repeat(r.priceLevel) : "No price"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Modal open={editingId === r.id} onOpenChange={(open) => setEditingId(open ? r.id : null)}>
                  <ModalTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label={`Edit ${r.name}`}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </ModalTrigger>
                  <ModalContent title={`Edit ${r.name}`}>
                    <RestaurantForm
                      initial={{ ...EMPTY, name: r.name, cuisine: r.cuisine ?? "", description: r.description ?? "", rating: r.rating != null ? String(r.rating) : "", priceLevel: r.priceLevel != null ? String(r.priceLevel) : "", bookingUrl: r.bookingUrl ?? "" }}
                      submitLabel="Save changes"
                      onSubmit={async (payload) => {
                        const res = await fetch(`/api/admin/restaurants/${r.id}`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify(payload),
                        });
                        const body = await res.json();
                        if (res.ok) {
                          setEditingId(null);
                          load();
                        }
                        return { ok: res.ok, message: body?.error?.message };
                      }}
                    />
                  </ModalContent>
                </Modal>
                <Button size="icon" variant="ghost" aria-label={`Delete ${r.name}`} onClick={() => handleDelete(r.id, r.name)}>
                  <Trash2 className="h-4 w-4 text-danger-500" aria-hidden="true" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
