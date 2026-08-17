/**
 * Telegram Bot API abstraction. Default implementation calls the Bot API
 * directly over HTTPS (no SDK dependency needed). TelegramService is the
 * only caller.
 */
export interface TelegramProvider {
  sendMessage(chatId: string, text: string, options?: TelegramSendOptions): Promise<void>;
}

export interface TelegramSendOptions {
  /** Reserved for the future ACCEPT/DECLINE inline keyboard — see docs/architecture.md. */
  buttons?: { text: string; callbackData: string }[];
}
