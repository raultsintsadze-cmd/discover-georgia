import { Badge } from "@/components/ui/Badge";

interface SettingRow {
  label: string;
  configured: boolean;
}

function row(label: string, value: string | undefined): SettingRow {
  return { label, configured: !!value && value.trim().length > 0 };
}

/**
 * Read-only diagnostics only — never renders a secret's actual value,
 * only whether it's set. No concrete "Settings" actions were specified in
 * the spec, so there's nothing editable here; this exists purely so an
 * admin can tell at a glance why, say, Telegram notifications aren't
 * being delivered (see docs/ai-architecture.md / TelegramService).
 */
export default function AdminSettingsPage() {
  const rows: SettingRow[] = [
    row("Database", process.env.DATABASE_URL),
    row("Auth secret", process.env.AUTH_SECRET),
    row("Google Maps (client)", process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY),
    row("Google Maps (server / geocoding)", process.env.GOOGLE_MAPS_SERVER_API_KEY),
    row("Routing provider", process.env.ROUTING_PROVIDER_API_KEY),
    row("OpenAI (AI Travel Agent)", process.env.OPENAI_API_KEY),
    row("Telegram bot token", process.env.TELEGRAM_BOT_TOKEN),
    row("Telegram admin chat id", process.env.ADMIN_CHAT_ID),
    row("Object storage", process.env.STORAGE_ACCESS_KEY_ID),
    row("Video provider", process.env.VIDEO_PROVIDER_TOKEN_ID),
    row("Redis (rate limiting, Phase 12)", process.env.REDIS_URL),
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-body-sm text-ink-500">
        Read-only — whether each integration is configured, never the secret values themselves.
      </p>
      <div className="flex flex-col divide-y divide-border rounded-lg border border-border">
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-3 p-3">
            <p className="text-body-sm text-ink-900">{r.label}</p>
            <Badge variant={r.configured ? "success" : "warning"}>{r.configured ? "Configured" : "Not set"}</Badge>
          </div>
        ))}
      </div>
    </div>
  );
}
