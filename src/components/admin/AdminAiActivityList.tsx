"use client";

import * as React from "react";
import { ChevronDown, ChevronRight } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Spinner } from "@/components/ui/Spinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils/cn";

interface Message {
  id: string;
  role: string;
  content: string | null;
  toolName: string | null;
  toolInput: unknown;
  toolOutput: unknown;
  createdAt: string;
}

interface Conversation {
  id: string;
  userLabel: string;
  tripName: string | null;
  messageCount: number;
  updatedAt: string;
  messages: Message[];
}

export function AdminAiActivityList() {
  const [loading, setLoading] = React.useState(true);
  const [conversations, setConversations] = React.useState<Conversation[]>([]);
  const [openId, setOpenId] = React.useState<string | null>(null);

  React.useEffect(() => {
    fetch("/api/admin/ai-activity")
      .then((r) => r.json())
      .then((b) => setConversations(b.data ?? []))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex justify-center py-10">
        <Spinner />
      </div>
    );
  }

  if (conversations.length === 0) {
    return <EmptyState title="No AI conversations yet" description="Chat activity from the Travel Agent will show up here." />;
  }

  return (
    <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
      {conversations.map((c) => {
        const open = openId === c.id;
        return (
          <div key={c.id}>
            <button
              type="button"
              onClick={() => setOpenId(open ? null : c.id)}
              aria-expanded={open}
              aria-controls={`conversation-${c.id}`}
              className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-surface-2"
            >
              <div className="flex min-w-0 items-center gap-2">
                {open ? <ChevronDown className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" /> : <ChevronRight className="h-4 w-4 shrink-0 text-ink-500" aria-hidden="true" />}
                <div className="min-w-0">
                  <p className="truncate text-body-sm font-medium text-ink-900">{c.userLabel}</p>
                  <p className="truncate text-caption text-ink-500">
                    {c.tripName ?? "No trip in context"} · {c.messageCount} messages
                  </p>
                </div>
              </div>
              <p className="shrink-0 text-caption text-ink-500">{new Date(c.updatedAt).toLocaleString()}</p>
            </button>
            {open && (
              <div id={`conversation-${c.id}`} className="flex flex-col gap-2 bg-surface-2/40 p-3">
                {c.messages.map((m) => (
                  <div key={m.id} className={cn("rounded-md border border-border bg-surface-1 p-2.5")}>
                    <div className="flex items-center gap-2">
                      <Badge variant={m.role === "TOOL" ? "accent" : m.role === "USER" ? "neutral" : "success"}>
                        {m.role}
                        {m.toolName ? `: ${m.toolName}` : ""}
                      </Badge>
                      <p className="text-caption text-ink-500">{new Date(m.createdAt).toLocaleTimeString()}</p>
                    </div>
                    {m.content && <p className="mt-1 whitespace-pre-line text-body-sm text-ink-700">{m.content}</p>}
                    {m.toolInput != null && (
                      <pre className="mt-1 overflow-x-auto text-caption text-ink-500">
                        in: {JSON.stringify(m.toolInput)}
                      </pre>
                    )}
                    {m.toolOutput != null && (
                      <pre className="mt-1 overflow-x-auto text-caption text-ink-500">
                        out: {JSON.stringify(m.toolOutput).slice(0, 500)}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
