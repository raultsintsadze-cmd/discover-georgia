import "server-only";
import { prisma } from "@/lib/db/client";
import { AiMessageRole, type Prisma } from "@prisma/client";
import type { AIService, AIAgentTurn, TripScore, AIToolName, StructuredItinerary } from "../ai.service";
import type { AIProvider, AIMessage, ToolDefinition } from "@/lib/providers/ai/types";
import type { TripDTO } from "../trip.service";
import type { TripRouteResult, RouteSegment } from "../route.service";
import type { ActivitySearchFilters } from "../activity.service";
import type { PlaceSummary } from "../place.service";
import type { LatLng } from "@/lib/types/domain";
import { openaiProvider } from "@/lib/providers/ai/openai";
import { placeService } from "./PlaceService";
import { routeService } from "./RouteService";
import { pricingService } from "./PricingService";
import { hotelService } from "./HotelService";
import { activityService } from "./ActivityService";
import { restaurantService } from "./RestaurantService";
import { driverService } from "./DriverService";
import { tripService } from "./TripService";
import { analyticsProvider } from "@/lib/providers/analytics/console";
import { DEFAULT_LOCALE, type Locale } from "@/i18n/locales";

const MAX_TOOL_TURNS = 6;

// ─────────────────────────────────────────────────────────────────────────
// Tool definitions (sent to the model). tripId is deliberately never a
// fillable parameter — it's injected server-side from the conversation's
// own trip, so the model can never point a tool at a trip it doesn't own.
// ─────────────────────────────────────────────────────────────────────────

const TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: "search_places",
    description:
      "Search published Georgian destinations by free-text query, region, and/or category. Returns real place summaries with ids — use those ids with get_place or update_trip.",
    parameters: {
      type: "object",
      properties: {
        query: { type: "string", description: "Free-text search, e.g. a place name or theme" },
        regionSlug: { type: "string", description: 'Filter by region slug, e.g. "kakheti"' },
        categorySlug: { type: "string", description: 'Filter by category slug, e.g. "wine"' },
      },
    },
  },
  {
    name: "get_place",
    description: "Get full details for one place by id (use an id returned by search_places).",
    parameters: {
      type: "object",
      properties: { placeId: { type: "string" } },
      required: ["placeId"],
    },
  },
  {
    name: "calculate_route",
    description:
      "Get the real driving distance, duration, and route geometry between two specific places by id. Always use this instead of estimating a distance yourself.",
    parameters: {
      type: "object",
      properties: { originPlaceId: { type: "string" }, destinationPlaceId: { type: "string" } },
      required: ["originPlaceId", "destinationPlaceId"],
    },
  },
  {
    name: "calculate_trip_distance",
    description: "Get the real total driving distance for the user's current trip, across every place currently on it.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "calculate_trip_time",
    description: "Get the real total driving time for the user's current trip.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_hotels",
    description:
      "List real hotels near a place or in a region. May return an empty list — that means no hotel data is available yet, not that there are no hotels. Say so plainly rather than guessing.",
    parameters: {
      type: "object",
      properties: {
        placeId: { type: "string", description: "List hotels near this place" },
        regionSlug: { type: "string", description: "List hotels in this region" },
      },
    },
  },
  {
    name: "get_activities",
    description:
      "List real activities, tours, or wine tastings near a place or in a region. May return an empty list, meaning no data is available yet.",
    parameters: {
      type: "object",
      properties: {
        placeId: { type: "string" },
        regionSlug: { type: "string" },
        category: { type: "string", enum: ["TOUR", "WINE_TASTING", "ADVENTURE", "CULTURE", "GENERAL"] },
      },
    },
  },
  {
    name: "get_restaurants",
    description:
      "List real restaurants near a place or in a region. May return an empty list — that means no restaurant data is available yet, not that there are no restaurants. Say so plainly rather than guessing.",
    parameters: {
      type: "object",
      properties: {
        placeId: { type: "string", description: "List restaurants near this place" },
        regionSlug: { type: "string", description: "List restaurants in this region" },
      },
    },
  },
  {
    name: "calculate_transport_cost",
    description:
      "Get the real estimated transport cost (distance + daily driver rate + fuel + fees, floored at the minimum trip price) for the user's current trip. Always present this to the user as an ESTIMATE, not a fixed price.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "get_available_drivers",
    description:
      "List every real verified, available driver, each with the regions they actually cover. There's no region filter parameter — region names in conversation don't reliably match our internal region slugs, so judge regional fit yourself from each driver's own \"regions\" field in the result rather than guessing a filter value.",
    parameters: { type: "object", properties: {} },
  },
  {
    name: "update_trip",
    description:
      'Modify the user\'s current trip with the smallest edit that satisfies the request. Never regenerate the whole itinerary.\n' +
      'operation "add_place": details = { dayNumber: number, placeId: string }. placeId MUST be one returned by search_places or get_place earlier in this conversation — if you don\'t already have a real placeId for the place the user named, call search_places first. Never guess or construct an id yourself; a made-up id fails with a database error and the edit won\'t happen.\n' +
      'operation "remove_place": details = { tripPlaceId: string } — get tripPlaceId from the current trip context below, not placeId.\n' +
      'operation "reorder": details = { dayNumber: number, orderedTripPlaceIds: string[] } — must list every tripPlaceId currently on that day, in the new order.\n' +
      'operation "change_dates": details = { startDate: string ("YYYY-MM-DD"), endDate: string ("YYYY-MM-DD") }.',
    parameters: {
      type: "object",
      properties: {
        operation: { type: "string", enum: ["add_place", "remove_place", "reorder", "change_dates"] },
        details: { type: "object", description: "Shape depends on operation — see tool description." },
      },
      required: ["operation", "details"],
    },
  },
];

const BASE_INSTRUCTIONS = `You are the Discover Georgia travel planning assistant. You help users plan real trips around Georgia (the country) using the tools available to you.

Hard rules:
- You are an orchestrator, not a calculator. Never state a distance, duration, price, or coordinate unless it came from a tool call you made in this turn. Never estimate, round from memory, or guess these values.
- Never invent an id (placeId, tripPlaceId, driverId, ...). Every id you pass to a tool must be one a tool actually returned to you earlier in this conversation — if you don't have one, call search_places (or the relevant lookup tool) first instead of constructing something that merely looks plausible.
- Never claim a hotel, restaurant, activity, or driver is available, or state its price or rating, beyond exactly what the matching tool returned. If a tool returns an empty list, or a null price/rating, say so plainly (e.g. "price/availability not currently available") — do not invent an alternative.
- Label non-trivial numbers as FACT (straight from a tool), ESTIMATE (a deterministic calculation over facts, e.g. transport cost), or RECOMMENDATION (your judgment, e.g. trip pacing advice) when it isn't obvious from context.
- When asked to change the trip, use update_trip with the smallest edit that satisfies the request. Never regenerate or replace the whole itinerary when a targeted edit will do.
- If you make a non-obvious change (e.g. reordering to reduce backtracking, or substituting a place), briefly explain why in your reply.
- If a tool call fails or returns nothing useful, tell the user the information isn't currently available. Do not fill the gap with a plausible-sounding guess.
- Keep replies concise and conversational — this is a mobile chat interface, not a report.`;

const OPTIMIZATION_GUIDANCE = `Optimization requests (Phase 8): when the user asks you to optimize or improve the trip, figure out which mode they mean (ask if genuinely ambiguous), then make the smallest set of update_trip edits that satisfy it. Never regenerate the whole itinerary, and never remove, reorder, or substitute a place the user didn't ask you to touch — an optimization is a targeted edit, not a redo.
- Route: reduce backtracking and driving distance/time between consecutive places — verify with calculate_route / calculate_trip_distance, don't guess.
- Budget: reduce estimated transport cost (e.g. cut driving distance or trip length) — check calculate_transport_cost before and after any change you propose.
- Comfort: keep single-day driving under roughly 4 hours where possible, by spreading long drives across more days or trimming far-flung stops. Use each day's cached driving figure below as a starting point.
- Nature: when substituting or adding, favor outdoor/nature places over other categories.
- Culture: when substituting or adding, favor cultural/historical places over other categories.
- Max destinations: fit in as many distinct places as the trip's days and driving budget reasonably allow.
After an optimization edit, briefly explain what changed and why.`;

const LANGUAGE_DIRECTIVE: Record<Locale, string> = {
  en: "Respond in English.",
  ka: "Respond in Georgian (ქართული). If the user writes to you in a different language, follow their language instead.",
  ru: "Respond in Russian (Русский). If the user writes to you in a different language, follow their language instead.",
};

async function buildSystemPrompt(tripId: string | null, userId: string, locale: Locale): Promise<string> {
  const languageDirective = LANGUAGE_DIRECTIVE[locale];

  if (!tripId) {
    return `${BASE_INSTRUCTIONS}\n\n${languageDirective}\n\nThe user has no trip in context right now — trip tools (calculate_trip_distance, calculate_trip_time, calculate_transport_cost, update_trip) aren't usable until they create one.`;
  }

  const trip = await tripService.getTrip(tripId, userId);
  if (!trip) {
    return `${BASE_INSTRUCTIONS}\n\n${languageDirective}\n\nThe trip previously in context no longer exists.`;
  }

  const placeIds = trip.days.flatMap((d) => d.places.map((p) => p.placeId));
  const places = placeIds.length > 0 ? await placeService.getManyByIds(placeIds) : [];
  const categoryByPlaceId = new Map(places.map((p) => [p.id, p.categoryName]));

  // Read-only — reuses whatever route is already cached so a plain chat
  // turn never silently triggers a real Directions API call (the model can
  // force a fresh one via calculate_trip_distance/time when it needs to).
  const route = await routeService.getTripRoute(tripId);
  const dayDriving = new Map(computeDayDriving(trip.days, route.segments).map((d) => [d.dayNumber, d]));

  const dayLines = trip.days.map((d) => {
    const dateLabel = d.date ? new Date(d.date).toISOString().slice(0, 10) : "no date";
    const placesLabel = d.places.length
      ? d.places
          .map(
            (p) =>
              `${p.placeName} [${categoryByPlaceId.get(p.placeId) ?? "unknown category"}] (placeId=${p.placeId}, tripPlaceId=${p.tripPlaceId})`
          )
          .join("; ")
      : "no places yet";
    const driving = dayDriving.get(d.dayNumber);
    const drivingLabel =
      driving && driving.durationSeconds > 0
        ? ` — driving so far: ~${Math.round(driving.durationSeconds / 60)} min, ${Math.round(driving.distanceMeters / 1000)} km (cached figure; may be stale if the trip changed this turn)`
        : "";
    return `Day ${d.dayNumber} (${dateLabel}): ${placesLabel}${drivingLabel}`;
  });

  const tripContext = [
    `Current trip: "${trip.name}", ${trip.travelers} traveler(s), budget ${trip.budget ?? "not set"} GEL.`,
    ...dayLines,
  ].join("\n");

  return `${BASE_INSTRUCTIONS}\n\n${languageDirective}\n\n${OPTIMIZATION_GUIDANCE}\n\n${tripContext}`;
}

// ─────────────────────────────────────────────────────────────────────────
// Tool execution — every branch is a thin delegation to an existing
// service. This is the structural reason the AI can't fabricate a fact:
// there is no code path here that produces a number without calling
// through to a real service/provider.
// ─────────────────────────────────────────────────────────────────────────

function asString(v: unknown): string | undefined {
  return typeof v === "string" && v.length > 0 ? v : undefined;
}

interface ToolContext {
  userId: string;
  tripId: string | null;
}

function requireTripId(ctx: ToolContext): string {
  if (!ctx.tripId) {
    throw new Error("No trip in context — the user needs to create or open a trip first");
  }
  return ctx.tripId;
}

async function ensureTripRoute(tripId: string): Promise<TripRouteResult> {
  const cached = await routeService.getTripRoute(tripId);
  if (cached.segments.length > 0) return cached;
  return routeService.calculateTripRoute(tripId);
}

async function getActiveDayCount(tripId: string, userId: string): Promise<number> {
  const trip = await tripService.getTrip(tripId, userId);
  if (!trip) throw new Error("Trip not found");
  return trip.days.filter((d) => d.places.length > 0).length;
}

async function executeUpdateTrip(
  tripId: string,
  userId: string,
  operation: unknown,
  details: unknown
): Promise<TripDTO> {
  const d = (details ?? {}) as Record<string, unknown>;
  switch (operation) {
    case "add_place": {
      const dayNumber = Number(d.dayNumber);
      const placeId = asString(d.placeId);
      if (!Number.isFinite(dayNumber) || !placeId) {
        throw new Error("add_place requires numeric dayNumber and placeId");
      }
      return tripService.addPlace(tripId, userId, dayNumber, placeId);
    }
    case "remove_place": {
      const tripPlaceId = asString(d.tripPlaceId);
      if (!tripPlaceId) {
        throw new Error("remove_place requires tripPlaceId");
      }
      return tripService.removePlace(tripId, userId, tripPlaceId);
    }
    case "reorder": {
      const dayNumber = Number(d.dayNumber);
      const orderedTripPlaceIds = Array.isArray(d.orderedTripPlaceIds) ? d.orderedTripPlaceIds.map(String) : null;
      if (!Number.isFinite(dayNumber) || !orderedTripPlaceIds) {
        throw new Error("reorder requires numeric dayNumber and orderedTripPlaceIds");
      }
      return tripService.reorderPlaces(tripId, userId, dayNumber, orderedTripPlaceIds);
    }
    case "change_dates": {
      const startDateStr = asString(d.startDate);
      const endDateStr = asString(d.endDate);
      if (!startDateStr || !endDateStr) {
        throw new Error("change_dates requires startDate and endDate");
      }
      return tripService.updateTrip(tripId, userId, { startDate: new Date(startDateStr), endDate: new Date(endDateStr) });
    }
    default:
      throw new Error(`Unknown update_trip operation: ${String(operation)}`);
  }
}

async function executeTool(
  name: string,
  llmArgs: Record<string, unknown>,
  ctx: ToolContext
): Promise<{ fullInput: unknown; output: unknown }> {
  switch (name) {
    case "search_places": {
      const input = {
        query: asString(llmArgs.query),
        regionSlug: asString(llmArgs.regionSlug),
        categorySlug: asString(llmArgs.categorySlug),
      };
      return { fullInput: input, output: await placeService.search(input) };
    }
    case "get_place": {
      const placeId = asString(llmArgs.placeId) ?? "";
      return { fullInput: { placeId }, output: await placeService.getById(placeId) };
    }
    case "calculate_route": {
      const originPlaceId = asString(llmArgs.originPlaceId) ?? "";
      const destinationPlaceId = asString(llmArgs.destinationPlaceId) ?? "";
      const output: RouteSegment = await routeService.getSegment(originPlaceId, destinationPlaceId);
      return { fullInput: { originPlaceId, destinationPlaceId }, output };
    }
    case "calculate_trip_distance": {
      const tripId = requireTripId(ctx);
      const route = await ensureTripRoute(tripId);
      return { fullInput: { tripId }, output: { totalDistanceMeters: route.totalDistanceMeters } };
    }
    case "calculate_trip_time": {
      const tripId = requireTripId(ctx);
      const route = await ensureTripRoute(tripId);
      return { fullInput: { tripId }, output: { totalDurationSeconds: route.totalDurationSeconds } };
    }
    case "get_hotels": {
      const placeId = asString(llmArgs.placeId);
      const regionSlug = asString(llmArgs.regionSlug);
      const output = placeId ? await hotelService.listNearPlace(placeId) : await hotelService.search({ regionSlug });
      return { fullInput: { placeId, regionSlug }, output };
    }
    case "get_activities": {
      const placeId = asString(llmArgs.placeId);
      const regionSlug = asString(llmArgs.regionSlug);
      const category = asString(llmArgs.category) as ActivitySearchFilters["category"];
      const output = placeId
        ? await activityService.listNearPlace(placeId)
        : await activityService.search({ regionSlug, category });
      return { fullInput: { placeId, regionSlug, category }, output };
    }
    case "get_restaurants": {
      const placeId = asString(llmArgs.placeId);
      const regionSlug = asString(llmArgs.regionSlug);
      const output = placeId
        ? await restaurantService.listNearPlace(placeId)
        : await restaurantService.search({ regionSlug });
      return { fullInput: { placeId, regionSlug }, output };
    }
    case "calculate_transport_cost": {
      const tripId = requireTripId(ctx);
      const route = await ensureTripRoute(tripId);
      const activeDays = await getActiveDayCount(tripId, ctx.userId);
      const output = await pricingService.estimateTransportCost({
        distanceMeters: route.totalDistanceMeters,
        tripDays: activeDays,
      });
      return { fullInput: { tripId }, output };
    }
    case "get_available_drivers": {
      return { fullInput: {}, output: await driverService.listAvailable({}) };
    }
    case "update_trip": {
      const tripId = requireTripId(ctx);
      const operation = llmArgs.operation;
      const details = llmArgs.details;
      const output = await executeUpdateTrip(tripId, ctx.userId, operation, details);
      return { fullInput: { tripId, operation, details }, output };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Day-driving attribution — shared by the structured itinerary (§ below)
// and Trip Score's comfort/efficiency scoring. Segments are attributed to
// the day they arrive on (the drive TO a day's first place counts toward
// that day, not the day before) — matches how a real itinerary reads
// ("Day 2: drive to Telavi, then explore").
// ─────────────────────────────────────────────────────────────────────────

interface DayDriving {
  dayNumber: number;
  distanceMeters: number;
  durationSeconds: number;
}

function computeDayDriving(days: TripDTO["days"], segments: RouteSegment[]): DayDriving[] {
  let segIndex = 0;
  let flatIndex = 0;

  return days.map((day) => {
    const placeCount = day.places.length;
    let daySegments: RouteSegment[] = [];

    if (placeCount > 0) {
      const entrySegments = flatIndex > 0 ? 1 : 0;
      const intraSegments = placeCount - 1;
      const segmentsForDay = entrySegments + intraSegments;
      daySegments = segments.slice(segIndex, segIndex + segmentsForDay);
      segIndex += segmentsForDay;
      flatIndex += placeCount;
    }

    return {
      dayNumber: day.dayNumber,
      distanceMeters: daySegments.reduce((sum, s) => sum + s.distanceMeters, 0),
      durationSeconds: daySegments.reduce((sum, s) => sum + s.durationSeconds, 0),
    };
  });
}

// ─────────────────────────────────────────────────────────────────────────
// Structured itinerary — assembled entirely from tool-derived data.
// ─────────────────────────────────────────────────────────────────────────

async function buildStructuredItinerary(tripId: string, userId: string): Promise<StructuredItinerary> {
  const trip = await tripService.getTrip(tripId, userId);
  if (!trip) {
    throw new Error("Trip not found");
  }
  // Read-only — a casual chat turn shouldn't silently trigger a real
  // Directions API call. Use calculate_trip_distance/time to force one.
  const route = await routeService.getTripRoute(tripId);
  const routeComputed = route.segments.length > 0;

  let estimatedTransportCostGel: number | null = null;
  if (routeComputed) {
    const activeDays = trip.days.filter((d) => d.places.length > 0).length;
    const estimate = await pricingService.estimateTransportCost({
      distanceMeters: route.totalDistanceMeters,
      tripDays: activeDays,
    });
    estimatedTransportCostGel = estimate.total.amount / 100;
  }

  const dayDriving = new Map(computeDayDriving(trip.days, route.segments).map((d) => [d.dayNumber, d]));

  const days = trip.days.map((day) => {
    const placeIds = day.places.map((p) => p.placeId);
    const driving = dayDriving.get(day.dayNumber);

    return {
      day: day.dayNumber,
      locations: placeIds,
      activities: [] as string[], // wired up once Phase 9 attaches real Activity rows to days
      overnight: { hotelId: null },
      driving:
        driving && (driving.distanceMeters > 0 || driving.durationSeconds > 0)
          ? { distanceMeters: driving.distanceMeters, durationSeconds: driving.durationSeconds }
          : null,
    };
  });

  return {
    days,
    totalDistanceMeters: route.totalDistanceMeters,
    totalDrivingSeconds: route.totalDurationSeconds,
    estimatedTransportCostGel,
    routeComputed,
  };
}

// ─────────────────────────────────────────────────────────────────────────
// Trip Score — routeEfficiency/drivingComfort/budgetFit are deterministic
// formulas over real tool-derived data; preferenceMatch is the one
// genuinely model-judged dimension (a RECOMMENDATION, not a fact — see
// docs/ai-architecture.md). `overall` stays a plain average rather than
// another model call, so the number is reproducible.
// ─────────────────────────────────────────────────────────────────────────

function toRadians(deg: number): number {
  return (deg * Math.PI) / 180;
}

function toDegrees(rad: number): number {
  return (rad * 180) / Math.PI;
}

/** Initial bearing from a to b, in degrees [0, 360). */
function bearing(a: LatLng, b: LatLng): number {
  const lat1 = toRadians(a.latitude);
  const lat2 = toRadians(b.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return (toDegrees(Math.atan2(y, x)) + 360) % 360;
}

/** Smallest absolute angle between two bearings, in degrees [0, 180]. */
function bearingDelta(b1: number, b2: number): number {
  const diff = Math.abs(b1 - b2) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

const REVERSAL_THRESHOLD_DEGREES = 100;

function computeRouteEfficiency(placeLocations: LatLng[]): { score: number; note: string | null } {
  if (placeLocations.length < 3) {
    return { score: 8, note: "Not enough places yet to assess route efficiency." };
  }

  let reversals = 0;
  let triples = 0;
  for (let i = 1; i < placeLocations.length - 1; i++) {
    const incoming = bearing(placeLocations[i - 1]!, placeLocations[i]!);
    const outgoing = bearing(placeLocations[i]!, placeLocations[i + 1]!);
    triples++;
    if (bearingDelta(incoming, outgoing) > REVERSAL_THRESHOLD_DEGREES) {
      reversals++;
    }
  }

  return { score: clamp(10 - (reversals / triples) * 10, 0, 10), note: null };
}

const COMFORT_THRESHOLD_HOURS = 4;
const PENALTY_PER_EXTRA_HOUR = 2;

function computeDrivingComfort(dayDriving: DayDriving[]): { score: number; note: string | null } {
  const maxSeconds = Math.max(0, ...dayDriving.map((d) => d.durationSeconds));
  if (maxSeconds === 0) {
    return { score: 8, note: "No driving on the itinerary yet — assuming a comfortable pace." };
  }

  const maxHours = maxSeconds / 3600;
  const score = clamp(10 - Math.max(0, maxHours - COMFORT_THRESHOLD_HOURS) * PENALTY_PER_EXTRA_HOUR, 0, 10);
  return { score, note: null };
}

const BUDGET_SLACK_RATIO = 0.9;
const BUDGET_PENALTY_PER_RATIO_POINT = 15;

function computeBudgetFit(
  budget: number | null,
  estimatedCostGel: number | null
): { score: number; note: string | null } {
  if (budget === null) {
    return { score: 8, note: "No budget set — assuming a neutral fit." };
  }
  if (estimatedCostGel === null) {
    return { score: 8, note: "Transport cost not calculated yet — assuming a neutral budget fit." };
  }

  const ratio = estimatedCostGel / budget;
  const score = clamp(10 - Math.max(0, ratio - BUDGET_SLACK_RATIO) * BUDGET_PENALTY_PER_RATIO_POINT, 0, 10);
  return { score, note: null };
}

const PREFERENCE_MATCH_SCHEMA = {
  type: "object",
  properties: {
    preferenceMatch: {
      type: "number",
      description: "0-10 score for how well the trip's places match the stated preferences",
    },
    rationale: { type: "string", description: "One or two sentences explaining the score" },
  },
  required: ["preferenceMatch", "rationale"],
  additionalProperties: false,
};

async function computePreferenceMatch(
  provider: AIProvider,
  places: PlaceSummary[],
  preferences: Record<string, unknown> | null
): Promise<{ score: number; note: string | null }> {
  if (places.length === 0) {
    return { score: 8, note: "No places on the trip yet — assuming a neutral preference match." };
  }
  if (!preferences || Object.keys(preferences).length === 0) {
    return { score: 8, note: "No preferences stated — assuming a neutral preference match." };
  }

  const placeLines = places.map((p) => `- ${p.name} (${p.categoryName}, ${p.regionName})`).join("\n");
  const prompt = `Trip places:\n${placeLines}\n\nStated preferences: ${JSON.stringify(preferences)}\n\nJudge how well these places match the stated preferences on a 0-10 scale.`;

  // Deliberately not part of the tool-calling loop (no tools, no
  // AiConversation/AiMessage persistence) — this is an internal scoring
  // detail, not a user-visible chat turn.
  const response = await provider.createResponse({
    systemPrompt:
      "You judge how well a list of real trip places matches a traveler's stated preferences. Respond only with the requested JSON.",
    messages: [{ role: "user", content: prompt }],
    tools: [],
    responseSchema: PREFERENCE_MATCH_SCHEMA,
  });

  if (response.type !== "message") {
    return { score: 8, note: "Preference match could not be judged this time — assuming a neutral fit." };
  }

  try {
    const parsed = JSON.parse(response.content) as { preferenceMatch: number; rationale: string };
    return { score: clamp(Number(parsed.preferenceMatch), 0, 10), note: null };
  } catch {
    return { score: 8, note: "Preference match could not be judged this time — assuming a neutral fit." };
  }
}

// ─────────────────────────────────────────────────────────────────────────

export class OpenAIAIService implements AIService {
  constructor(private readonly provider: AIProvider) {}

  async startConversation(userId: string, tripId?: string): Promise<{ conversationId: string }> {
    if (tripId) {
      const trip = await tripService.getTrip(tripId, userId);
      if (!trip) {
        throw new Error("Trip not found");
      }
    }
    const conversation = await prisma.aiConversation.create({ data: { userId, tripId } });
    return { conversationId: conversation.id };
  }

  async sendMessage(conversationId: string, userText: string, locale: Locale = DEFAULT_LOCALE): Promise<AIAgentTurn> {
    const conversation = await prisma.aiConversation.findUniqueOrThrow({
      where: { id: conversationId },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });

    await prisma.aiMessage.create({ data: { conversationId, role: AiMessageRole.USER, content: userText } });

    // Prior tool-call mechanics aren't replayed across turns (only what the
    // user said and what the assistant finally replied) — always valid to
    // send, and the assistant's own reply text already carries the outcome
    // of any tools it used in a past turn.
    const history: AIMessage[] = conversation.messages
      .filter((m) => m.role === AiMessageRole.USER || m.role === AiMessageRole.ASSISTANT)
      .map((m) => ({ role: m.role === AiMessageRole.USER ? "user" : "assistant", content: m.content }));
    const messages: AIMessage[] = [...history, { role: "user", content: userText }];

    const systemPrompt = await buildSystemPrompt(conversation.tripId, conversation.userId, locale);

    const toolCallsLog: { name: AIToolName; input: unknown; output: unknown }[] = [];
    let updatedTrip: TripDTO | null = null;
    let replyText = "";

    for (let turn = 0; turn < MAX_TOOL_TURNS; turn++) {
      const response = await this.provider.createResponse({ systemPrompt, messages, tools: TOOL_DEFINITIONS });

      if (response.type === "message") {
        replyText = response.content;
        await prisma.aiMessage.create({ data: { conversationId, role: AiMessageRole.ASSISTANT, content: replyText } });
        break;
      }

      messages.push({ role: "assistant", content: null, toolCalls: response.calls });

      for (const call of response.calls) {
        const toolName = call.name as AIToolName;
        let fullInput: unknown = call.arguments;
        let output: unknown;
        try {
          const result = await executeTool(call.name, call.arguments, {
            userId: conversation.userId,
            tripId: conversation.tripId,
          });
          fullInput = result.fullInput;
          output = result.output;
        } catch (err) {
          output = { error: err instanceof Error ? err.message : "Tool execution failed" };
        }

        toolCallsLog.push({ name: toolName, input: fullInput, output });
        await prisma.aiMessage.create({
          data: {
            conversationId,
            role: AiMessageRole.TOOL,
            toolName: call.name,
            toolInput: fullInput as Prisma.InputJsonValue,
            toolOutput: output as Prisma.InputJsonValue,
          },
        });

        messages.push({ role: "tool", toolCallId: call.id, toolName: call.name, content: JSON.stringify(output) });

        if (call.name === "update_trip" && output && typeof output === "object" && "id" in output) {
          updatedTrip = output as TripDTO;
        }
      }

      if (turn === MAX_TOOL_TURNS - 1) {
        replyText = "I wasn't able to finish that — could you try rephrasing or breaking it into a smaller request?";
        await prisma.aiMessage.create({ data: { conversationId, role: AiMessageRole.ASSISTANT, content: replyText } });
      }
    }

    let structuredItinerary: StructuredItinerary | null = null;
    if (conversation.tripId) {
      structuredItinerary = await buildStructuredItinerary(conversation.tripId, conversation.userId);
    }

    const changeExplanations = toolCallsLog.some((tc) => tc.name === "update_trip") ? [replyText] : [];

    analyticsProvider.track({ name: "ai_planner_used", conversationId, userId: conversation.userId });

    return { reply: replyText, toolCalls: toolCallsLog, updatedTrip, changeExplanations, structuredItinerary };
  }

  async getTripScore(tripId: string, userId: string): Promise<TripScore> {
    const trip = await tripService.getTrip(tripId, userId);
    if (!trip) {
      throw new Error("Trip not found");
    }

    // Unlike buildStructuredItinerary (read-only, avoids surprising API
    // calls on a casual chat turn), a score request is an explicit ask —
    // force a real route calculation if none is cached yet.
    const route = await ensureTripRoute(tripId);
    const dayDriving = computeDayDriving(trip.days, route.segments);

    const placeIds = trip.days.flatMap((d) => d.places.map((p) => p.placeId));
    const places = placeIds.length > 0 ? await placeService.getManyByIds(placeIds) : [];
    const placesById = new Map(places.map((p) => [p.id, p]));
    const placeLocations = placeIds
      .map((id) => placesById.get(id)?.location)
      .filter((loc): loc is LatLng => loc !== undefined);

    let estimatedCostGel: number | null = null;
    if (route.segments.length > 0) {
      const activeDays = trip.days.filter((d) => d.places.length > 0).length;
      const estimate = await pricingService.estimateTransportCost({
        distanceMeters: route.totalDistanceMeters,
        tripDays: activeDays,
      });
      estimatedCostGel = estimate.total.amount / 100;
    }

    const routeEfficiency = computeRouteEfficiency(placeLocations);
    const drivingComfort = computeDrivingComfort(dayDriving);
    const budgetFit = computeBudgetFit(trip.budget, estimatedCostGel);
    const preferenceMatch = await computePreferenceMatch(this.provider, places, trip.preferences);

    const overall =
      Math.round(((routeEfficiency.score + drivingComfort.score + budgetFit.score + preferenceMatch.score) / 4) * 10) /
      10;

    const notes = [routeEfficiency.note, drivingComfort.note, budgetFit.note, preferenceMatch.note].filter(
      (n): n is string => n !== null
    );

    return {
      overall,
      routeEfficiency: routeEfficiency.score,
      drivingComfort: drivingComfort.score,
      budgetFit: budgetFit.score,
      preferenceMatch: preferenceMatch.score,
      notes,
    };
  }
}

export const aiService: AIService = new OpenAIAIService(openaiProvider);
