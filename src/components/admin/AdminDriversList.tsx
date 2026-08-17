"use client";

import * as React from "react";
import { ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { useToast } from "@/components/ui/Toast";

interface Driver {
  id: string;
  name: string;
  vehicle: string | null;
  rating: number | null;
  tripsCompleted: number;
  regions: string[];
  verificationStatus: string;
  availabilityStatus: string;
}

const VERIFICATION_VARIANT: Record<string, "neutral" | "accent" | "success" | "warning" | "danger"> = {
  PENDING: "warning",
  VERIFIED: "success",
  SUSPENDED: "danger",
};

export function AdminDriversList() {
  const { toast } = useToast();
  const [loading, setLoading] = React.useState(true);
  const [drivers, setDrivers] = React.useState<Driver[]>([]);
  const [actingId, setActingId] = React.useState<string | null>(null);

  const load = React.useCallback(() => {
    setLoading(true);
    fetch("/api/admin/drivers")
      .then((r) => r.json())
      .then((b) => setDrivers(b.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  async function verify(id: string) {
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/drivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "verify" }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: "Couldn't verify driver", description: body?.error?.message, variant: "danger" });
        return;
      }
      toast({ title: "Driver verified", variant: "success" });
      load();
    } finally {
      setActingId(null);
    }
  }

  async function suspend(id: string) {
    const reason = window.prompt("Reason for suspending this driver:");
    if (!reason) return;
    setActingId(id);
    try {
      const res = await fetch(`/api/admin/drivers/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "suspend", reason }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: "Couldn't suspend driver", description: body?.error?.message, variant: "danger" });
        return;
      }
      toast({ title: "Driver suspended", variant: "success" });
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

  if (drivers.length === 0) {
    return <EmptyState title="No drivers yet" description="Drivers added to the roster will show up here." />;
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {drivers.map((d) => (
        <div key={d.id} className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="truncate text-body-sm font-medium text-ink-900">{d.name}</p>
              <Badge variant={VERIFICATION_VARIANT[d.verificationStatus] ?? "neutral"}>{d.verificationStatus}</Badge>
              <Badge variant={d.availabilityStatus === "AVAILABLE" ? "accent" : "neutral"}>
                {d.availabilityStatus}
              </Badge>
            </div>
            <p className="truncate text-caption text-ink-500">
              {d.vehicle ?? "No vehicle on file"} · {d.tripsCompleted} trips · {d.regions.join(", ") || "No regions"}
            </p>
          </div>
          <div className="flex shrink-0 gap-1">
            {d.verificationStatus !== "VERIFIED" && (
              <Button size="sm" variant="outline" loading={actingId === d.id} onClick={() => verify(d.id)}>
                <ShieldCheck className="h-4 w-4" aria-hidden="true" />
                Verify
              </Button>
            )}
            {d.verificationStatus !== "SUSPENDED" && (
              <Button size="sm" variant="outline" loading={actingId === d.id} onClick={() => suspend(d.id)}>
                <ShieldOff className="h-4 w-4 text-danger-500" aria-hidden="true" />
                Suspend
              </Button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
