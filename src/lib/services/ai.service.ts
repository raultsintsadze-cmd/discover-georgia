import type { PlaceDetail, PlaceSummary } from "./place.service";
import type { RouteSegment } from "./route.service";
import type { TransportCostEstimate } from "./pricing.service";
import type { HotelDTO } from "./hotel.service";
import type { ActivityDTO } from "./activity.service";
import type { RestaurantDTO } from "./restaurant.service";
import type { DriverSummary } from "./driver.service";
import type { TripDTO } from "./trip.service";
import type { Locale } from "@/i18n/locales";

/**
 * The OpenAI Travel Agent orchestrator (spec §30-36). AIService owns the
 * tool-calling loop over AIProvider; it is the ONLY caller of AIProvider.
 * Every tool implementation below simply delegates to the corresponding
 * domain service — the AI never touches the database or a provider
 * directly, so it structurally cannot fabricate a fact. See
 * docs/ai-architecture.md for the full guardrail rationale.
 */
export interface AIService {
  startConversation(userId: string, tripId?: string): Promise<{ conversationId: string }>;
  sendMessage(conversationId: string, userText: string, locale?: Locale): Promise<AIAgentTurn>;
  getTripScore(tripId: string, userId: string): Promise<TripScore>;
}

/** One assistant turn: a natural-language reply, plus which tools it used and what changed. */
export interface AIAgentTurn {
  reply: string;
  toolCalls: { name: AIToolName; input: unknown; output: unknown }[];
  updatedTrip: TripDTO | null;
  /** Human-readable explanations for non-obvious changes, e.g. "Moved Martvili after Kazbegi to reduce backtracking." */
  changeExplanations: string[];
  /** Present whenever the conversation has a trip in context — always assembled from real data, never LLM-generated. */
  structuredItinerary: StructuredItinerary | null;
}

/**
 * spec §33's itinerary shape, populated entirely from tool outputs
 * (TripService/RouteService/PricingService) — the model narrates around
 * it but never fills in the numbers itself. See docs/ai-architecture.md §6.
 */
export interface StructuredItinerary {
  days: {
    day: number;
    locations: string[]; // place ids
    activities: string[]; // reserved for Phase 9 — always [] until then
    overnight: { hotelId: string | null };
    driving: { distanceMeters: number; durationSeconds: number } | null;
  }[];
  totalDistanceMeters: number;
  totalDrivingSeconds: number;
  estimatedTransportCostGel: number | null;
  routeComputed: boolean;
}

/** score is a RECOMMENDATION, not a measurement — see domain.ts Confidence and ai-architecture.md. */
export interface TripScore {
  overall: number; // 0-10
  routeEfficiency: number;
  drivingComfort: number;
  budgetFit: number;
  preferenceMatch: number;
  /** Honest caveats when a sub-score used a default because data was missing, e.g. "No budget set — assuming neutral fit." Never silently present a default as if it were computed. */
  notes: string[];
}

export type AIToolName =
  | "search_places"
  | "get_place"
  | "calculate_route"
  | "calculate_trip_distance"
  | "calculate_trip_time"
  | "get_hotels"
  | "get_activities"
  | "get_restaurants"
  | "calculate_transport_cost"
  | "get_available_drivers"
  | "update_trip";

/**
 * Maps each tool name to its input/output shape. Used to keep the tool
 * registry implementation (Phase 7) type-safe end to end, and to generate
 * the JSON Schema ToolDefinition sent to AIProvider.
 */
export interface AIToolIO {
  search_places: { input: { query?: string; regionSlug?: string; categorySlug?: string }; output: PlaceSummary[] };
  get_place: { input: { placeId: string }; output: PlaceDetail | null };
  calculate_route: { input: { originPlaceId: string; destinationPlaceId: string }; output: RouteSegment };
  calculate_trip_distance: { input: { tripId: string }; output: { totalDistanceMeters: number } };
  calculate_trip_time: { input: { tripId: string }; output: { totalDurationSeconds: number } };
  get_hotels: { input: { regionSlug?: string; placeId?: string }; output: HotelDTO[] };
  get_activities: { input: { regionSlug?: string; placeId?: string; category?: string }; output: ActivityDTO[] };
  get_restaurants: { input: { regionSlug?: string; placeId?: string }; output: RestaurantDTO[] };
  calculate_transport_cost: { input: { tripId: string }; output: TransportCostEstimate };
  get_available_drivers: { input: { regionSlug?: string }; output: DriverSummary[] };
  update_trip: {
    input: { tripId: string; operation: "add_place" | "remove_place" | "reorder" | "change_dates"; details: unknown };
    output: TripDTO;
  };
}
