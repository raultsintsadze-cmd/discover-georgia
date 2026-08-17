"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Modal, ModalTrigger, ModalContent } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { AdminPlaceForm, EMPTY_PLACE_FORM, type AdminPlaceFormValues } from "./AdminPlaceForm";
import type { PlaceAdminSummary } from "@/lib/services/place.service";

const STATUS_VARIANT: Record<string, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  DRAFT: "warning",
  PUBLISHED: "success",
  ARCHIVED: "neutral",
};

function toFormValues(place: PlaceAdminSummary): AdminPlaceFormValues {
  return {
    ...EMPTY_PLACE_FORM,
    name: place.name,
    shortDescription: place.shortDescription,
    latitude: String(place.location.latitude),
    longitude: String(place.location.longitude),
    status: place.status as AdminPlaceFormValues["status"],
  };
}

export function AdminPlacesTable({ initialPlaces }: { initialPlaces: PlaceAdminSummary[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = React.useState(false);
  const [editingId, setEditingId] = React.useState<string | null>(null);

  async function handleDelete(id: string, name: string) {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    const res = await fetch(`/api/admin/places/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const body = await res.json();
      toast({ title: "Couldn't delete", description: body?.error?.message, variant: "danger" });
      return;
    }
    toast({ title: "Deleted", variant: "success" });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3">
      <Modal open={createOpen} onOpenChange={setCreateOpen}>
        <ModalTrigger asChild>
          <Button size="sm" className="self-start">
            <Plus className="h-4 w-4" aria-hidden="true" />
            New place
          </Button>
        </ModalTrigger>
        <ModalContent title="New place">
          <AdminPlaceForm
            initial={EMPTY_PLACE_FORM}
            submitLabel="Create place"
            onSubmit={async (payload) => {
              const res = await fetch("/api/admin/places", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
              });
              const body = await res.json();
              if (res.ok) {
                setCreateOpen(false);
                router.refresh();
              }
              return { ok: res.ok, message: body?.error?.message };
            }}
          />
        </ModalContent>
      </Modal>

      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {initialPlaces.map((place) => (
          <div key={place.id} className="flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <p className="truncate text-body-sm font-medium text-ink-900">{place.name}</p>
                <Badge variant={STATUS_VARIANT[place.status] ?? "neutral"}>{place.status}</Badge>
              </div>
              <p className="truncate text-caption text-ink-500">
                {place.regionName} · {place.categoryName}
              </p>
            </div>
            <div className="flex shrink-0 gap-1">
              <Modal open={editingId === place.id} onOpenChange={(open) => setEditingId(open ? place.id : null)}>
                <ModalTrigger asChild>
                  <Button size="icon" variant="ghost" aria-label={`Edit ${place.name}`}>
                    <Pencil className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </ModalTrigger>
                <ModalContent title={`Edit ${place.name}`}>
                  <AdminPlaceForm
                    initial={toFormValues(place)}
                    submitLabel="Save changes"
                    onSubmit={async (payload) => {
                      const res = await fetch(`/api/admin/places/${place.id}`, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify(payload),
                      });
                      const body = await res.json();
                      if (res.ok) {
                        setEditingId(null);
                        router.refresh();
                      }
                      return { ok: res.ok, message: body?.error?.message };
                    }}
                  />
                </ModalContent>
              </Modal>
              <Button
                size="icon"
                variant="ghost"
                aria-label={`Delete ${place.name}`}
                onClick={() => handleDelete(place.id, place.name)}
              >
                <Trash2 className="h-4 w-4 text-danger-500" aria-hidden="true" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
