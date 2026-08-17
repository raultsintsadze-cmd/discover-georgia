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
import type { HotelDTO } from "@/lib/services/hotel.service";

interface FormState {
  name: string;
  place: PlaceSummary | null;
  description: string;
  category: string;
  rating: string;
  price: string;
  bookingUrl: string;
}

const EMPTY: FormState = { name: "", place: null, description: "", category: "", rating: "", price: "", bookingUrl: "" };

function HotelForm({ initial, onSubmit, submitLabel }: { initial: FormState; onSubmit: (payload: Record<string, unknown>) => Promise<{ ok: boolean; message?: string }>; submitLabel: string }) {
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
        description: values.description || undefined,
        category: values.category || undefined,
        rating: values.rating ? Number(values.rating) : undefined,
        price: values.price ? Number(values.price) : undefined,
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
      <Field label="Description">
        {(f) => <Textarea {...f} value={values.description} onChange={(e) => set("description", e.target.value)} />}
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Category" helperText="e.g. Boutique, Guesthouse">
          {(f) => <Input {...f} value={values.category} onChange={(e) => set("category", e.target.value)} />}
        </Field>
        <Field label="Rating (0-5)">
          {(f) => <Input {...f} type="number" min={0} max={5} step="0.1" value={values.rating} onChange={(e) => set("rating", e.target.value)} />}
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price / night (GEL)">
          {(f) => <Input {...f} type="number" min={0} value={values.price} onChange={(e) => set("price", e.target.value)} />}
        </Field>
        <Field label="Booking URL">
          {(f) => <Input {...f} type="url" value={values.bookingUrl} onChange={(e) => set("bookingUrl", e.target.value)} />}
        </Field>
      </div>
      <Button type="submit" loading={submitting} className="mt-2">
        {submitLabel}
      </Button>
    </form>
  );
}

export function AdminHotelsPanel() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [hotels, setHotels] = React.useState<HotelDTO[]>([]);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/admin/hotels")
      .then((r) => r.json())
      .then((b) => setHotels(b.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"?`)) return;
    const res = await fetch(`/api/admin/hotels/${id}`, { method: "DELETE" });
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
            New hotel
          </Button>
        </ModalTrigger>
        <ModalContent title="New hotel">
          <HotelForm
            initial={EMPTY}
            submitLabel="Create hotel"
            onSubmit={async (payload) => {
              const res = await fetch("/api/admin/hotels", {
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

      {hotels.length === 0 ? (
        <EmptyState title="No hotels yet" description="Add the first one above." />
      ) : (
        <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
          {hotels.map((h) => (
            <div key={h.id} className="flex items-center justify-between gap-3 p-3">
              <div className="min-w-0">
                <p className="truncate text-body-sm font-medium text-ink-900">{h.name}</p>
                <p className="truncate text-caption text-ink-500">
                  {h.category ?? "Hotel"} · {h.rating != null ? `${h.rating.toFixed(1)}★` : "Not rated"} ·{" "}
                  {h.price != null ? `${h.price} GEL` : "No price"}
                </p>
              </div>
              <div className="flex shrink-0 gap-1">
                <Modal open={editingId === h.id} onOpenChange={(open) => setEditingId(open ? h.id : null)}>
                  <ModalTrigger asChild>
                    <Button size="icon" variant="ghost" aria-label={`Edit ${h.name}`}>
                      <Pencil className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </ModalTrigger>
                  <ModalContent title={`Edit ${h.name}`}>
                    <HotelForm
                      initial={{ ...EMPTY, name: h.name, description: h.description ?? "", category: h.category ?? "", rating: h.rating != null ? String(h.rating) : "", price: h.price != null ? String(h.price) : "", bookingUrl: h.bookingUrl ?? "" }}
                      submitLabel="Save changes"
                      onSubmit={async (payload) => {
                        const res = await fetch(`/api/admin/hotels/${h.id}`, {
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
                <Button size="icon" variant="ghost" aria-label={`Delete ${h.name}`} onClick={() => handleDelete(h.id, h.name)}>
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
