"use client";

import * as React from "react";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface Application {
  id: string;
  displayName: string;
  bio: string | null;
  instagram: string | null;
  tiktok: string | null;
  applicantEmail: string | null;
}

export function AdminCreatorsQueue() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [applications, setApplications] = React.useState<Application[]>([]);
  const [actingId, setActingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/admin/creators")
      .then((r) => r.json())
      .then((b) => setApplications(b.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function approve(id: string) {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/creators/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "approve" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: "Couldn't approve", description: body?.error?.message, variant: "danger" });
        return;
      }
      toast({ title: "Creator approved", variant: "success" });
      load();
    } finally {
      setActingId(null);
    }
  }

  async function reject(id: string) {
    const reason = window.prompt("Reason for rejecting this application:");
    if (!reason) return;
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/creators/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reject", reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: "Couldn't reject", description: body?.error?.message, variant: "danger" });
        return;
      }
      toast({ title: "Application rejected", variant: "success" });
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

  if (applications.length === 0) {
    return <EmptyState title="No pending applications" description="New creator applications will show up here." />;
  }

  return (
    <div className="flex flex-col gap-3">
      {applications.map((a) => (
        <Card key={a.id}>
          <CardContent className="pt-4">
            <p className="text-body-sm font-medium text-ink-900">{a.displayName}</p>
            <p className="text-caption text-ink-500">{a.applicantEmail}</p>
            {a.bio && <p className="mt-2 text-body-sm text-ink-700">{a.bio}</p>}
            <p className="mt-1 text-caption text-ink-500">
              {a.instagram ? `Instagram @${a.instagram}` : ""}
              {a.instagram && a.tiktok ? " · " : ""}
              {a.tiktok ? `TikTok @${a.tiktok}` : ""}
            </p>
            <div className="mt-3 flex gap-2">
              <Button size="sm" variant="outline" loading={actingId === a.id} onClick={() => reject(a.id)}>
                <X className="h-4 w-4" aria-hidden="true" />
                Reject
              </Button>
              <Button size="sm" loading={actingId === a.id} onClick={() => approve(a.id)}>
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
