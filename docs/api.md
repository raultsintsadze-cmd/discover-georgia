# Discover Georgia — API

Route implementations land in the phase that needs them; this document
fixes the surface and conventions now so every phase builds consistent
endpoints. Routes are Next.js Route Handlers under `src/app/api/**`. Each
handler is a thin adapter: parse + `zod`-validate the request, call
**one** service method, shape the response. No business logic in a route
handler — that belongs in the service layer (see architecture.md §3).

## 1. Conventions

- **Base path**: `/api/*`. No `/v1` prefix yet — this is a single
  first-party client (the Next.js app itself), so versioning overhead
  isn't justified until there's an external consumer.
- **Format**: JSON in, JSON out. `Content-Type: application/json`.
- **Auth**: session cookie (Auth.js). Server components/route handlers
  read the session via `auth()`; no bearer tokens for the first-party
  client.
- **Success shape**: `{ data: T }`.
- **Error shape**: `{ error: { code: string, message: string, fields?: Record<string, string> } }`
  with a matching HTTP status (`400` validation, `401` unauthenticated,
  `403` unauthorized, `404` not found, `409` conflict, `429` rate
  limited, `500` unexpected). `fields` is populated for `400`s from zod
  issues, keyed by field path.
- **Pagination**: page-based (`?page=&pageSize=`) for `/api/places` — the
  catalog is a curated, admin-moderated set (tens to low hundreds of rows),
  not a firehose, so cursor pagination's extra complexity isn't earning
  its keep yet. Revisit as cursor-based if/when the video feed (Phase 3)
  needs infinite-scroll semantics a page number can't give you mid-feed.
- **Idempotency**: mutation endpoints that trigger side effects the user
  could double-fire on a flaky mobile connection (trip request creation)
  accept an optional `Idempotency-Key` header, deduplicated server-side
  via a `(userId, idempotencyKey)` unique constraint (Phase 10) — a
  retried request with the same key returns the original row instead of
  creating a duplicate. Kept permanently rather than expired after a
  window: the client generates a fresh random key per user action
  (`crypto.randomUUID()`), so two real actions never collide and there's
  nothing a TTL/cleanup job would buy beyond what a plain unique
  constraint already gives for free.

## 2. Auth requirement legend

- **Public** — no session required.
- **User** — any authenticated session.
- **Owner** — authenticated + the service layer verifies the resource
  belongs to the caller.
- **Admin** — authenticated + `role === "ADMIN"`.
- **Driver** — authenticated + a `Driver` row linked to the session user.

## 3. Route surface

### Auth — Auth.js + one custom route
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/auth/register` | Public | `{ name, email, password }` — creates the `User` row; caller still has to sign in afterward (registration ≠ session) |
| * | `/api/auth/[...nextauth]` | — | Auth.js's own catch-all (`signin`, `callback/credentials`, `session`, `csrf`, `signout`, ...) — not a hand-written route, see `src/lib/auth/config.ts` |

### Places / regions / categories — backed by `PlaceService`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/places` | Public | filters: `q, region, category, tag, page, pageSize` |
| GET | `/api/places/[slug]` | Public | full `PlaceDetail` |
| GET | `/api/places/nearby` | Public | `?lat=&lng=&radiusKm=` — real PostGIS query, never guessed |
| GET | `/api/places/by-ids` | Public | `?ids=a,b,c` (max 50) — bulk lookup for clients holding ids without full summaries (e.g. TripMap after an edit) |
| GET | `/api/regions` | Public | |
| GET | `/api/regions/[slug]/places` | Public | |
| GET | `/api/categories` | Public | |
| GET | `/api/categories/[slug]/places` | Public | |

### Video — backed by `VideoService`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/places/[slug]/videos` | Public | featured + approved additional videos |
| GET | `/api/feed` | Public | `?page=&pageSize=` — paginated Discover feed (place + featured video, `video: null` until one's approved) |
| POST | `/api/videos/submissions` | User | requires `ownershipConfirmed: true`, `existingPlaceId` (MVP: no free-text new-place suggestions — see docs/database.md) |
| POST | `/api/videos/[id]/view` | Public | fire-and-forget analytics increment |
| POST | `/api/videos/[id]/complete` | Public | completion tracking |

### Creators — backed by `CreatorService`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/creators/[id]` | Public | |
| POST | `/api/creators/apply` | User | creates `PENDING` creator application |

### Saved places — backed by `PlaceService` + a thin saves table accessor
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/saved` | Owner | |
| POST | `/api/saved` | Owner | `{ placeId }` |
| DELETE | `/api/saved/[placeId]` | Owner | |

### Trips — backed by `TripService`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/trips` | Owner | list caller's trips |
| POST | `/api/trips` | User | create |
| GET | `/api/trips/[id]` | Owner | |
| PATCH | `/api/trips/[id]` | Owner | dates/budget/preferences |
| DELETE | `/api/trips/[id]` | Owner | |
| POST | `/api/trips/[id]/places` | Owner | add place to a day |
| DELETE | `/api/trips/[id]/places/[tripPlaceId]` | Owner | |
| POST | `/api/trips/[id]/reorder` | Owner | `{ dayNumber, orderedTripPlaceIds }` |
| GET | `/api/trips/[id]/summary` | Owner | distance/time/cost via Route+Pricing services |

### Routing — backed by `RouteService`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/trips/[id]/route` | Owner | reads cached segments — empty if the itinerary changed since the last calculation (see docs/database.md "Route invalidation") |
| POST | `/api/trips/[id]/route` | Owner | (re)computes all segments for the trip via the real routing provider |

### Pricing / drivers — backed by `PricingService` / `DriverService`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/pricing/estimate` | Public, except Owner when `?tripId=` is used | `?tripId=` (needs a calculated route) or `?distanceMeters=&tripDays=` |
| GET | `/api/drivers` | Public | filters: `region, minSeats, languages` |
| GET | `/api/drivers/[id]` | Public | |
| GET | `/api/trips/[id]/drivers` | Owner | available drivers + a per-driver estimated price for this trip's real route (spec §27 driver card) |

### Hotels / restaurants / activities (spec §37, §38, Phase 9) — backed by `HotelService` / `RestaurantService` / `ActivityService`
| Method | Path | Auth | Notes |
|---|---|---|---|
| GET | `/api/hotels` | Public | filters: `region, maxPrice, minRating` |
| GET | `/api/restaurants` | Public | filters: `region, cuisine, maxPriceLevel` |
| GET | `/api/activities` | Public | filters: `region, category` (`TOUR, WINE_TASTING, ADVENTURE, CULTURE, GENERAL`) |
| GET | `/api/places/[slug]/hotels` | Public | hotels near this place, matches the `/api/places/[slug]/videos` convention |
| GET | `/api/places/[slug]/restaurants` | Public | restaurants near this place |
| GET | `/api/places/[slug]/activities` | Public | activities near this place |

All three services return `null` for an unknown price/rating rather than a guess — the UI and AI must render that as "not currently available," never as zero or omitted (spec §37).

### AI travel agent — backed by `AIService`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/ai/conversations` | User | `{ tripId? }` → `{ conversationId }` |
| POST | `/api/ai/conversations/[id]/messages` | Owner | `{ text }` → `AIAgentTurn`. Synchronous request/response for now, not streamed — `AIService.sendMessage` resolves a single value and the tool-calling loop needs to finish before there's anything coherent to show anyway; SSE token streaming is a UX polish item, not deferred for a technical reason |
| GET | `/api/trips/[id]/score` | Owner | `TripScore` (spec §60, Phase 8) — routeEfficiency/drivingComfort/budgetFit are deterministic formulas over real tool-derived data, preferenceMatch is a single model-judged call; `overall` is a plain average. Always a RECOMMENDATION, never presented as fact — see `TripScore.notes` and docs/ai-architecture.md §9 |

### Trip requests / booking (spec §28, §29, Phase 10) — backed by `BookingService` / `TelegramService` / `NotificationService`
| Method | Path | Auth | Notes |
|---|---|---|---|
| POST | `/api/trip-requests` | User | `{ tripId, driverId?, passengers, notes? }`, optional `Idempotency-Key` header; forces a route calculation if the cache is empty, freezes an itinerary snapshot, then best-effort notifies admin + driver over Telegram (never fails the booking if notification delivery fails) |
| GET | `/api/trip-requests/[id]` | Owner, assigned Driver, or Admin | Admin access added in Phase 11 for the admin Trips page |
| GET | `/api/trip-requests/mine` | User | customer view |
| GET | `/api/driver/trip-requests` | Driver | driver's inbox — requires the DRIVER role **and** a linked `Driver.userId` profile (`requireDriverSession`) |
| PATCH | `/api/driver/trip-requests/[id]` | Driver | `{ status: "DRIVER_ACCEPTED" \| "CANCELLED" }` — accept/decline, only valid from `PENDING`, only by the assigned driver |

### Admin — every route below is **Admin**, backed by the matching service
| Method | Path | Notes |
|---|---|---|
| GET/POST | `/api/admin/places` | `PlaceService.adminList`/`createPlace` — adminList returns every status, not just PUBLISHED |
| PATCH/DELETE | `/api/admin/places/[id]` | `PlaceService.updatePlace`/`deletePlace` |
| GET | `/api/admin/videos` | `VideoService.listRecent` — every PUBLISHED video, for picking a featured one |
| PATCH | `/api/admin/videos/[id]` | sets this video as its place's featured video → `VideoService.setFeatured` |
| GET | `/api/admin/submissions` | pending queue → `VideoService.listPendingSubmissions` |
| PATCH | `/api/admin/submissions/[id]` | `{ action: "approve" }` \| `{ action: "reject", reason }` → `VideoService` |
| GET | `/api/admin/creators` | pending queue → `CreatorService.listPendingApplications` (not in the original plan — added once the moderation UI needed a queue to read, same as submissions) |
| PATCH | `/api/admin/creators/[id]` | approve/reject → `CreatorService` |
| GET | `/api/admin/drivers` | every driver regardless of status → `DriverService.listAll` (added; the original plan only had the PATCH row, but there was no way to list who's pending) |
| PATCH | `/api/admin/drivers/[id]` | verify/suspend → `DriverService` |
| GET | `/api/admin/trips` | `TripService.adminList` — every trip across every user |
| GET | `/api/admin/trip-requests` | `BookingService.adminList` — added alongside `/api/admin/trips` for spec §40's "view trip requests" action, not in the original table |
| GET | `/api/admin/users` | direct `prisma.user` read — no dedicated UserService exists |
| GET/POST | `/api/admin/hotels`, `/api/admin/activities`, `/api/admin/restaurants` | `HotelService`, `ActivityService`, `RestaurantService` — `nearPlaceId` is required on create; region/coordinates are derived from the linked place, never entered separately |
| PATCH/DELETE | `/api/admin/hotels/[id]`, `/api/admin/activities/[id]`, `/api/admin/restaurants/[id]` | same three services |
| GET/POST | `/api/admin/pricing-rules` | `PricingService` |
| GET | `/api/admin/ai-activity` | reads `AiConversation`/`AiMessage` for support/debugging |

## 4. Rate limiting (Phase 12)

Implemented in `src/middleware.ts` via `src/lib/api/rateLimit.ts` —
fixed-window counters on the three named routes: `POST
/api/videos/submissions` (5/min), `POST /api/ai/conversations*` (20/min,
covers both conversation creation and message-sending), `POST
/api/trip-requests` (10/min). Exceeding a limit returns `429` in the
standard error shape with a `Retry-After` header.

**Honest limitation**: this is an in-memory, single-process Map, keyed by
IP address (not `userId` — middleware runs in the Edge runtime and can't
safely import the auth config, which pulls in Prisma/bcrypt). It resets
on redeploy and doesn't share state across multiple server instances.
`REDIS_URL` is reserved in `.env.example` for exactly this upgrade — swap
`checkRateLimit`'s Map for a Redis-backed token bucket without touching
any call site — but until it's configured, this is still a real guardrail
for the current single-instance deployment, not a no-op.

## 5. Server actions vs route handlers

Route handlers are used everywhere a mobile client contract is useful
(testable in isolation, matches the "abstract the API layer" requirement
from the product spec §6). Next.js Server Actions are not used for
primary mutations, to keep exactly one API surface — avoids the
"business logic behind two different entry points" trap.
