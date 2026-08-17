"use client";

import * as React from "react";
import Link from "next/link";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface VideoRow {
  id: string;
  placeName: string;
  placeSlug: string;
  creatorName: string | null;
  isFeatured: boolean;
  viewCount: number;
  completionCount: number;
}

export function AdminVideosList() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [videos, setVideos] = React.useState<VideoRow[]>([]);
  const [actingId, setActingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/admin/videos")
      .then((r) => r.json())
      .then((b) => setVideos(b.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function setFeatured(id: string) {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/videos/${id}`, { method: "PATCH" });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: "Couldn't set featured video", description: body?.error?.message, variant: "danger" });
        return;
      }
      toast({ title: "Featured video updated", variant: "success" });
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

  if (videos.length === 0) {
    return <EmptyState title="No published videos yet" description="Approve a submission to publish the first one." />;
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {videos.map((v) => (
        <div key={v.id} className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Link href={`/places/${v.placeSlug}`} className="truncate text-body-sm font-medium text-ink-900 hover:underline">
                {v.placeName}
              </Link>
              {v.isFeatured && <Badge variant="accent">Featured</Badge>}
            </div>
            <p className="truncate text-caption text-ink-500">
              {v.creatorName ?? "Unattributed"} · {v.viewCount} views · {v.completionCount} completions
            </p>
          </div>
          <Button
            size="sm"
            variant={v.isFeatured ? "secondary" : "outline"}
            loading={actingId === v.id}
            disabled={v.isFeatured}
            onClick={() => setFeatured(v.id)}
          >
            <Star className="h-4 w-4" aria-hidden="true" />
            {v.isFeatured ? "Featured" : "Set featured"}
          </Button>
        </div>
      ))}
    </div>
  );
}
