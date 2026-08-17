import "server-only";
import type { AnalyticsProvider, AnalyticsEvent } from "./types";

/** Default implementation: logs to the server console. Never throws — a broken analytics call must never break the real action it's attached to. */
export class ConsoleAnalyticsProvider implements AnalyticsProvider {
  track(event: AnalyticsEvent): void {
    try {
      console.debug("[analytics]", event.name, event);
    } catch {
      // Swallowed on purpose — see class comment.
    }
  }
}

export const analyticsProvider: AnalyticsProvider = new ConsoleAnalyticsProvider();
