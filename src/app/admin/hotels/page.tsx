"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";
import { AdminHotelsPanel } from "@/components/admin/AdminHotelsPanel";
import { AdminActivitiesPanel } from "@/components/admin/AdminActivitiesPanel";
import { AdminRestaurantsPanel } from "@/components/admin/AdminRestaurantsPanel";

const TABS = ["Hotels", "Activities", "Restaurants"] as const;

export default function AdminHotelsPage() {
  const [tab, setTab] = React.useState<(typeof TABS)[number]>("Hotels");

  return (
    <div className="flex flex-col gap-4">
      <div role="tablist" aria-label="Listing type" className="flex gap-1">
        {TABS.map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={cn(
              "rounded-full px-3 py-1.5 text-body-sm transition-colors",
              tab === t ? "bg-accent-500 text-ink-onaccent" : "text-ink-700 hover:bg-surface-2"
            )}
          >
            {t}
          </button>
        ))}
      </div>
      {tab === "Hotels" && <AdminHotelsPanel />}
      {tab === "Activities" && <AdminActivitiesPanel />}
      {tab === "Restaurants" && <AdminRestaurantsPanel />}
    </div>
  );
}
