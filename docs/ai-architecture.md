# Discover Georgia — AI Travel Agent Architecture

Implemented in Phase 7 (base agent + tools) and Phase 8 (optimization,
trip score, conversational editing). This document fixes the design now
so those phases build against a single agreed shape. Type contracts:
[`src/lib/services/ai.service.ts`](../src/lib/services/ai.service.ts),
[`src/lib/providers/ai/types.ts`](../src/lib/providers/ai/types.ts).

## 1. Role of the AI

> The AI is a travel-planning orchestrator. It is not a calculator and
> not the source of truth for factual values. (spec §30)

Concretely: the model **never** computes distance, duration, price, or
coordinates, and never asserts hotel/driver availability from its own
knowledge. Every factual number in an AI response was produced by a tool
call that delegates to a domain service backed by the database or a real
provider (Mapbox Directions, PricingService's DB-configured rules, etc.).
This is enforced structurally, not by prompting alone: `AIService` has no
database client and no provider clients of its own (see
`ai.service.ts`'s imports — only other services' DTO types) — it is
architecturally incapable of inventing a number, because it has no code
path that produces one outside a tool call.

## 2. Orchestration loop

```
User message
  → AIService.sendMessage(conversationId, text)
  → append AiMessage(role=USER)
  → loop (max 6 rounds):
      AIProvider.createResponse({ systemPrompt, messages, tools })
      if response.type === "message":       → done, append AiMessage(role=ASSISTANT)
      if response.type === "tool_calls":    → for each call:
                                                 execute the matching service method
                                                 append AiMessage(role=TOOL, toolName, toolInput, toolOutput)
                                             → loop again with tool results appended
  → assemble structuredItinerary from real trip/route/pricing state (§6)
  → return AIAgentTurn { reply, toolCalls, updatedTrip, changeExplanations, structuredItinerary }
```

Every tool call and its raw output is persisted as an `AiMessage` row
(`toolInput`/`toolOutput` JSON columns) — a full audit trail that can be
inspected later (admin "AI Activity" screen, Phase 11) to verify a given
answer traces back to real data.

**Cross-turn history is intentionally lossy.** Within one `sendMessage`
call, the in-memory message array correctly threads assistant
tool-call requests and their tool results (required for the provider's
API to accept the conversation). But when a *later*, separate
`sendMessage` call rebuilds history from the DB, it replays only USER
and ASSISTANT text — never the intermediate TOOL messages. This sidesteps
ever having to reconstruct exact tool-call-id pairing across requests
(which the schema doesn't preserve), at the cost of the model not seeing
raw historical tool output past the turn it happened in. In practice this
doesn't lose much: the assistant's own final reply already narrates the
outcome, and any number the user asks about again gets a fresh tool call
anyway — nothing here should be treated as a cache.

**Trip context is injected directly into the system prompt**, not
fetched via a tool — the tool list is fixed at 10 per spec §30, with no
`get_trip`, yet `update_trip`'s `remove_place`/`reorder` operations need
`tripPlaceId`s the model can't derive from anything else. Each
`sendMessage` call fetches the current trip fresh and appends a compact
per-day listing (place name, `placeId`, `tripPlaceId`) to the system
prompt. This is also the literal fulfillment of "trip context" as a
Phase 7 deliverable — the model always has an accurate, current view of
the trip without a dedicated tool.

## 3. Tools

Each tool is a direct, thin delegation — no tool contains business logic
beyond calling one service method and mapping its DTO to the tool output
shape. Full input/output types: `AIToolIO` in `ai.service.ts`.

| Tool | Delegates to | Returns |
|---|---|---|
| `search_places` | `PlaceService.search` | matching places |
| `get_place` | `PlaceService.getById` | one place's full detail |
| `calculate_route` | `RouteService.getSegment` | distance/duration/geometry for one leg |
| `calculate_trip_distance` | `RouteService.getTripRoute`, computing fresh if empty | total trip distance |
| `calculate_trip_time` | same as above | total driving time |
| `get_hotels` | `HotelService.listNearPlace`/`search` | hotel options (price/rating `null` if unknown — never fabricated, rendered as "not currently available") |
| `get_activities` | `ActivityService.listNearPlace`/`search` | activity/tour/wine-tasting/adventure options |
| `get_restaurants` | `RestaurantService.listNearPlace`/`search` | restaurant options (Phase 9) |
| `calculate_transport_cost` | `RouteService` + `PricingService.estimateTransportCost` | cost breakdown, always presented as **ESTIMATED PRICE** |
| `get_available_drivers` | `DriverService.listAvailable({})` | every verified, available driver |
| `update_trip` | `TripService.addPlace`/`removePlace`/`reorderPlaces`/`updateTrip` | the mutated trip |

`update_trip` is deliberately a single tool with an `operation` discriminant
(`add_place | remove_place | reorder | change_dates`) rather than four
separate tools — this keeps the tool list short for the model while the
underlying service methods stay separate and independently authorized.

`tripId` is never a fillable parameter on any tool that needs one — it's
injected server-side from the conversation's own bound trip, so the
model has no way to point a tool at a trip it doesn't own even if it
tried; the JSON schemas sent to the provider simply don't expose the
field.

`get_available_drivers` takes **no filter parameters at all**, including
no region — this was a deliberate fix after live testing showed the
model guessing a plausible-sounding but wrong region slug (`"kazbegi"`
for a place whose actual region is `"mtskheta-mtianeti"`), which
silently zeroed out a real, available driver. The tool now always
returns the full list and the model reasons about regional fit from each
driver's own `regions` field in the result — the same choice already
made for the human-facing driver list in `/api/trips/[id]/drivers`
(Phase 6). `get_hotels`/`get_activities`/`get_restaurants` keep an
optional `regionSlug` since a `placeId` is normally available and
preferred; a bad region guess there fails safe (an honest empty list)
rather than masking a real match.

## 4. Fact / Estimate / Recommendation

Every value the agent surfaces is one of three kinds (spec §32, §36); the
system prompt requires the model to label which kind it's giving, and the
UI renders each kind with a distinct visual treatment (Phase 8):

| Kind | Examples | Source |
|---|---|---|
| **FACT** | distance, driving time, route geometry, place coordinates, driver's listed rate | Tool output, verbatim |
| **ESTIMATE** | total transport cost | Deterministic formula in `PricingService` over facts — not a guess, but not a quote either |
| **RECOMMENDATION** | trip score, "move Martvili after Kazbegi", suggested pace | Model judgment over facts |

`Labeled<T>` in `src/lib/types/domain.ts` is the shared type for this
tagging where it needs to flow through code (not just prompt text).

## 5. When information is unavailable

The system prompt instructs the model to say so explicitly rather than
filling a gap — e.g. `HotelDTO.price === null` must be surfaced as
"price not currently available" (spec §37), never rounded, guessed, or
omitted silently. This mirrors the DB modeling: nullable fields on
`Hotel`/`Restaurant`/`Activity` mean "unknown", not "zero".

## 6. Structured itinerary output

`AIRequest.responseSchema` exists as a provider-level capability (wired
through to OpenAI's `response_format: json_schema`) but the structured
itinerary itself does **not** go through it. Even schema-constrained LLM
JSON output is still the model filling in numbers token by token — the
schema guarantees *shape*, not that a distance field holds the real
distance. Spec §33's instinct ("the agent assembles the schema after
tool results are available, it doesn't predict the numbers into the
schema directly") is implemented literally: `AIService` builds
`StructuredItinerary` itself, in code, from `TripService.getTrip` +
`RouteService.getTripRoute` + `PricingService.estimateTransportCost` —
the model never touches these fields at all, so there's no path from
"model hallucination" to "wrong number in the itinerary," independent of
how good the model's JSON-following is.

```ts
interface StructuredItinerary {
  days: {
    day: number;
    locations: string[];       // place ids, from TripService
    activities: string[];      // always [] — no day-level attachment exists yet
                                // (TripDay has overnightHotelId but no
                                // Activity join table); get_activities/
                                // get_restaurants/get_hotels (Phase 9) let
                                // the AI recommend real options in chat,
                                // but nothing pins one to a specific day
    overnight: { hotelId: string | null }; // same gap — TripDay.overnightHotelId
                                            // exists in the schema but nothing
                                            // writes it yet
    driving: { distanceMeters: number; durationSeconds: number } | null;
  }[];
  totalDistanceMeters: number;
  totalDrivingSeconds: number;
  estimatedTransportCostGel: number | null;
  routeComputed: boolean;
}
```

Attached to **every** `AIAgentTurn` where the conversation has a trip in
context (`AIAgentTurn.structuredItinerary`), not just on request — a
UI can always render a current itinerary summary alongside the chat
reply. Per-day `driving` is attributed to the day you *arrive* on: the
leg from a day's last place to the next day's first place counts toward
the next day, matching how a real itinerary reads ("Day 2: drive to
Telavi, then explore"). Reads `RouteService.getTripRoute` (cached only)
rather than force-recalculating — a casual chat turn shouldn't silently
trigger a real Directions API call; only `calculate_trip_distance`/
`calculate_trip_time`/`calculate_transport_cost` do that, and only when
the cache is empty.

## 7. Conversational editing

Requests like "remove Batumi" or "no more than 3 hours driving per day"
call `update_trip` (and re-run the relevant `calculate_*` tools
afterward) against the **existing** `Trip`/`TripDay`/`TripPlace` rows.
The agent is instructed to make the smallest edit that satisfies the
request and never to regenerate the full itinerary from scratch — this
is a prompt-level instruction backed by the tool design: there is no
"regenerate_trip" tool, only targeted `update_trip` operations, so a full
rebuild isn't the path of least resistance for the model.

## 8. Optimization modes (Phase 8)

Route/budget/comfort/nature/culture optimization and "maximum
destinations" are prompt strategies over the same tool set, not separate
code paths — `AIService.ts`'s `OPTIMIZATION_GUIDANCE` constant (appended
to the system prompt whenever a trip is in context) spells out what each
mode means in terms of the existing tools, e.g. "budget optimization"
instructs the model to prefer `update_trip` edits that reduce
`calculate_transport_cost` output, using the exact same tools as ordinary
planning. The per-day trip context in the system prompt also lists each
place's category and a cached (not force-recalculated) per-day driving
figure from `computeDayDriving`, so the model can reason about "Day 3 is
6h of driving" without spending a tool turn on it first. The guardrail is
structural, not just prompted: there is no "regenerate_trip" tool, only
targeted `update_trip` operations, so a full rebuild isn't the path of
least resistance for the model even under an "optimize this" request.
When a change is non-obvious (e.g. reordering to cut backtracking), the
agent must include a human-readable explanation in
`AIAgentTurn.changeExplanations` (spec §35's "I moved Martvili..."
example) — the UI surfaces these as inline notes, not buried in chat
history.

## 9. Trip score

`AIService.getTripScore(tripId, userId)` returns a `TripScore` —
`overall`, `routeEfficiency`, `drivingComfort`, `budgetFit`,
`preferenceMatch`, and `notes` (honest caveats for any sub-score that
fell back to a neutral default because data was missing). Three
sub-scores are deterministic formulas over real data, not model output:

- **routeEfficiency**: bearing-reversal heuristic over the trip's real
  place coordinates — for each interior place, compare the incoming and
  outgoing bearing; a turn sharper than 100° counts as backtracking.
  `score = 10 - (reversals / triples) * 10`. Fewer than 3 places → `8`
  with a note (not enough data to assess).
- **drivingComfort**: penalizes the single longest driving day (from
  `computeDayDriving`, shared with the structured itinerary) beyond a
  4-hour comfort threshold, 2 points per extra hour. No driving yet → `8`
  with a note.
- **budgetFit**: compares `PricingService`'s real transport cost estimate
  against `Trip.budget`, penalizing above 90% utilization. No budget set,
  or cost not yet computed → `8` with a note — never silently treated as
  a real zero-cost or zero-budget fit.

`preferenceMatch` is the one genuinely model-judged dimension (a
RECOMMENDATION, matching §4's labeling convention) — a dedicated
`AIProvider.createResponse` call (not part of the tool-calling loop, no
`AiConversation`/`AiMessage` persistence: this is an internal scoring
detail, not a user-visible chat turn) with `tools: []` and a strict
`responseSchema`, given the trip's real places (name + category, via
`PlaceService.getManyByIds`) and `Trip.preferences`. No places, or no
preferences stated → `8` with a note, skipping the model call entirely.

`overall` is a plain average of the four sub-scores, kept deterministic
(not another model call) so the number is reproducible — it still counts
as a recommendation, not a fact, since it blends formula-estimates with
one model-judged component. The UI must present it as an estimate
("8.7 / 10 — our estimate"), never as a certified measurement, matching
spec §36.

## 10. Implementation note: OpenAI client keep-alive

The `openai` Node SDK's default HTTP client reuses pooled keep-alive
connections. In this environment that reliably produced `Premature
close` errors against `api.openai.com` — confirmed to be Node/undici-
specific, not a real network or auth problem, by successfully completing
the identical request with the same key via a non-Node HTTP client.
Fix: `OpenAIProvider` constructs its client with
`httpAgent: new https.Agent({ keepAlive: false })`, forcing a fresh
connection per request. If this SDK version or Node version changes,
re-check whether the workaround is still needed.

## 11. Guardrails checklist (enforced in the system prompt + reviewed in Phase 7 QA)

- Never state a distance, duration, price, or coordinate without a
  matching tool call in the same turn's `toolCalls`.
- Never claim hotel/driver availability beyond what the tool returned.
- Always label FACT / ESTIMATE / RECOMMENDATION for non-trivial numbers.
- Prefer the smallest `update_trip` edit over a full regeneration.
- Explain non-obvious changes in plain language.
- If a required tool call fails (provider error, no data), say the
  information is unavailable — never substitute a plausible-sounding
  value.
