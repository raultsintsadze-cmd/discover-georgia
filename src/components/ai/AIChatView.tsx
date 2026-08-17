"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Spinner } from "@/components/ui/Spinner";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils/cn";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  toolNames?: string[];
  tripUpdated?: boolean;
}

// Prompt text is intentionally left hardcoded in English (not run through t()):
// this string is sent as the literal chat message to the AI, which is instructed
// elsewhere to reply in the user's selected language regardless of the language
// the instruction itself is written in. Translating it risks confusing the
// model's tool-selection for no user-visible benefit — only the button label
// (labelKey, looked up via t() in the component) is localized.
const OPTIMIZATION_CHIPS: { labelKey: string; prompt: string }[] = [
  { labelKey: "chipOptimizeRoute", prompt: "Optimize this trip's route to reduce backtracking and driving distance." },
  { labelKey: "chipOptimizeBudget", prompt: "Optimize this trip to reduce the estimated cost while keeping the highlights." },
  { labelKey: "chipOptimizeComfort", prompt: "Optimize this trip so no single day has too much driving." },
  { labelKey: "chipMoreNature", prompt: "Adjust this trip to favor nature and outdoor places." },
  { labelKey: "chipMoreCulture", prompt: "Adjust this trip to favor cultural and historical places." },
  { labelKey: "chipMaxDestinations", prompt: "Fit as many distinct places into this trip as reasonably possible." },
];

export function AIChatView({ tripId }: { tripId: string }) {
  const router = useRouter();
  const t = useTranslations("ai");
  const { toast } = useToast();
  const [conversationId, setConversationId] = React.useState<string | null>(null);
  const [starting, setStarting] = React.useState(true);
  const [messages, setMessages] = React.useState<ChatMessage[]>([]);
  const [input, setInput] = React.useState("");
  const [sending, setSending] = React.useState(false);
  const listRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    fetch("/api/ai/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tripId }),
    })
      .then((res) => res.json())
      .then((body) => setConversationId(body.data?.conversationId ?? null))
      .finally(() => setStarting(false));
  }, [tripId]);

  React.useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  async function sendText(text: string) {
    if (!text || !conversationId || sending) return;

    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
    setSending(true);

    try {
      const res = await fetch(`/api/ai/conversations/${conversationId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const body = await res.json();
      if (!res.ok) {
        toast({ title: t("respondErrorToastTitle"), description: body?.error?.message, variant: "danger" });
        return;
      }
      const turn = body.data;
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          text: turn.reply,
          toolNames: turn.toolCalls?.map((t: { name: string }) => t.name),
          tripUpdated: !!turn.updatedTrip,
        },
      ]);
      if (turn.updatedTrip) {
        router.refresh();
      }
    } catch {
      toast({ title: t("respondErrorToastTitle"), description: t("respondErrorToastDescription"), variant: "danger" });
    } finally {
      setSending(false);
    }
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const text = input.trim();
    if (!text) return;
    setInput("");
    await sendText(text);
  }

  function handleChipClick(prompt: string) {
    void sendText(prompt);
  }

  if (starting) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (!conversationId) {
    return (
      <div className="flex flex-1 items-center justify-center px-6 text-center">
        <p className="text-body-sm text-ink-500">{t("startError")}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div ref={listRef} className="flex-1 overflow-y-auto px-5 py-4">
        {messages.length === 0 && (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <Sparkles className="h-6 w-6 text-accent-500" aria-hidden="true" />
            <p className="text-body-sm text-ink-500">{t("greeting")}</p>
          </div>
        )}
        <div className="flex flex-col gap-3">
          {messages.map((m) => (
            <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
              <div
                className={cn(
                  "max-w-[85%] rounded-lg px-3.5 py-2.5 text-body-sm",
                  m.role === "user" ? "bg-accent-500 text-ink-onaccent" : "bg-surface-2 text-ink-900"
                )}
              >
                <p className="whitespace-pre-line">{m.text}</p>
                {m.role === "assistant" && (m.toolNames?.length || m.tripUpdated) && (
                  <div className="mt-1.5 flex flex-wrap items-center gap-1.5 border-t border-black/5 pt-1.5">
                    {m.tripUpdated && <span className="text-caption font-medium text-success-500">{t("tripUpdated")}</span>}
                    {m.toolNames?.length ? (
                      <span className="text-caption text-ink-500">{t("usedLabel", { tools: m.toolNames.join(", ") })}</span>
                    ) : null}
                  </div>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="rounded-lg bg-surface-2 px-4 py-3">
                <Spinner label={t("thinkingLabel")} />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto border-t border-border px-5 py-2">
        {OPTIMIZATION_CHIPS.map((chip) => (
          <Button
            key={chip.labelKey}
            type="button"
            variant="outline"
            size="sm"
            className="shrink-0 rounded-full"
            disabled={sending}
            onClick={() => handleChipClick(chip.prompt)}
          >
            {t(chip.labelKey)}
          </Button>
        ))}
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 border-t border-border px-5 py-3 pb-safe">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t("inputPlaceholder")}
          disabled={sending}
          className="rounded-full"
        />
        <Button type="submit" size="icon" disabled={!input.trim() || sending} aria-label={t("sendLabel")}>
          <Send className="h-4 w-4" aria-hidden="true" />
        </Button>
      </form>
    </div>
  );
}
