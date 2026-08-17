import "server-only";
import type { TelegramProvider, TelegramSendOptions } from "./types";

interface TelegramApiResponse {
  ok: boolean;
  description?: string;
}

export class HttpTelegramProvider implements TelegramProvider {
  constructor(private readonly botToken: string) {}

  async sendMessage(chatId: string, text: string, options?: TelegramSendOptions): Promise<void> {
    if (!this.botToken) {
      throw new Error("TELEGRAM_BOT_TOKEN is not configured");
    }

    const res = await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        ...(options?.buttons?.length
          ? {
              reply_markup: {
                inline_keyboard: [options.buttons.map((b) => ({ text: b.text, callback_data: b.callbackData }))],
              },
            }
          : {}),
      }),
    });

    const data = (await res.json().catch(() => null)) as TelegramApiResponse | null;
    if (!res.ok || !data?.ok) {
      throw new Error(`Telegram sendMessage failed: ${data?.description ?? `HTTP ${res.status}`}`);
    }
  }
}

export const telegramProvider = new HttpTelegramProvider(process.env.TELEGRAM_BOT_TOKEN ?? "");
