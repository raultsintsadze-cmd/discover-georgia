"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface Submission {
  id: string;
  placeName: string;
  existingPlaceId: string | null;
  activityName: string | null;
  detectedCodec: string | null;
  videoUrl: string;
  description: string | null;
  creatorName: string;
  instagram: string | null;
  tiktok: string | null;
  contactEmail: string;
  createdAt: string;
}

export function AdminSubmissionsQueue() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [submissions, setSubmissions] = React.useState<Submission[]>([]);
  const [actingId, setActingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/admin/submissions")
      .then((r) => r.json())
      .then((b) => setSubmissions(b.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: "Couldn't approve", description: body?.error?.message, variant: "danger" });
        return;
      }
      toast({ title: "Approved and published", variant: "success" });
      load();
    } finally {
      setActingId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Reason for rejecting this submission:");
    if (!reason) return;
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/submissions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: "Couldn't reject", description: body?.error?.message, variant: "danger" });
        return;
      }
      toast({ title: "Rejected", variant: "success" });
      load();
    } finally {
      setActingId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  if (submissions.length === 0) {
    return <EmptyState title="No pending submissions" description="New video submissions will show up here for review." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {submissions.map((s) => (
        <Card key={s.id}>
          <CardContent className="pt-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-body-sm font-medium text-ink-900">{s.placeName}</p>
                <p className="text-caption text-ink-500">
                  {s.existingPlaceId ? "Linked to an existing place" : "No linked place — cannot approve yet"}
                  {s.activityName ? ` · Tagged: ${s.activityName}` : ""}
                </p>
              </div>
              {s.detectedCodec === "hevc" && (
                <Badge variant="warning" className="shrink-0">
                  HEVC detected
                </Badge>
              )}
            </div>
            <p className="mt-2 text-body-sm text-ink-700">{s.description ?? "No description provided."}</p>
            <a href={s.videoUrl} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-caption text-accent-500">
              {s.videoUrl}
            </a>
            <p className="mt-2 text-caption text-ink-500">
              By {s.creatorName} · {s.contactEmail}
              {s.instagram ? ` · @${s.instagram}` : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                variant="outline"
                loading={actingId === s.id}
                onClick={() => reject(s.id)}
              >
                <X className="h-4 w-4" aria-hidden="true" />
                Reject
              </Button>
              <Button
                size="sm"
                loading={actingId === s.id}
                disabled={!s.existingPlaceId}
                onClick={() => approve(s.id)}
              >
                <Check className="h-4 w-4" aria-hidden="true" />
                Approve
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
