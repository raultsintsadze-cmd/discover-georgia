/**
 * Thin abstraction over wherever analytics events actually go — matches
 * every other provider in this codebase (AIProvider, TelegramProvider,
 * ...). The default implementation just logs; swapping in PostHog or
 * Google Analytics later is a new class behind this same interface, not
 * a change to any of the call sites below (spec §41 "architect for
 * future PostHog/Google Analytics").
 */
export interface AnalyticsProvider {
  track(event: AnalyticsEvent): void;
}

/** The 8 events spec §41 names, one variant each. */
export type AnalyticsEvent =
  | { name: "place_view"; placeId: string }
  | { name: "video_view"; videoId: string }
  | { name: "video_completion"; videoId: string }
  | { name: "place_saved"; placeId: string; userId: string }
  | { name: "trip_created"; tripId: string; userId: string }
  | { name: "ai_planner_used"; conversationId: string; userId: string }
  | { name: "driver_request_created"; tripRequestId: string; userId: string }
  | { name: "creator_submission"; submissionType: "video" | "creator_application"; userId: string };
