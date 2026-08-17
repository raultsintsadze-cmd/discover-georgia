# Discover Georgia — System Architecture

Phase 0 deliverable. This document is the map of how the system is built;
it should stay accurate as later phases land — update it when a phase
changes a boundary described here.

## 1. Product summary

A mobile-first travel discovery + AI trip-planning platform for Georgia.
Core loop: **Video → Place → Save → Add to Trip → AI Plan → Route/Distance/
Time → Cost → Driver → Request → Telegram notify**. See the product spec
for full detail; this document covers the technical shape only.

## 2. Stack decisions

| Concern | Choice | Why |
|---|---|---|
| App framework | Next.js 15 (App Router), React 19, TypeScript | Single deployable for UI + API routes, server components for fast first paint on mobile, mature ecosystem |
| Styling | Tailwind CSS + shadcn/ui | Utility-first keeps the design system centralized in tokens (Phase 1), shadcn gives accessible unstyled primitives instead of a generic component-library look |
| Database | PostgreSQL + PostGIS extension | Relational integrity for trips/bookings, native geospatial queries for "nearby" and map clustering |
| ORM | Prisma | Type-safe queries, migration tooling; `Unsupported()` type used for the PostGIS geography column since Prisma doesn't model it natively (see database.md) |
| Auth | Auth.js (NextAuth v5) | Credentials-only for now (JWT sessions, no OAuth app needed yet); OAuth (Google) can be added as a second provider later — see §5 |
| Object storage | S3-compatible (Cloudflare R2 by default) | Cheap egress for images; abstracted behind `StorageProvider` so swapping to S3/GCS is a config change |
| Video | Mux (default) | Handles transcoding/adaptive bitrate/CDN delivery for the vertical feed; abstracted behind `VideoProvider` |
| Maps | Google Maps JavaScript API (`@vis.gl/react-google-maps`) + Google Geocoding API | Project decision (Phase 2) to standardize on Google's platform; abstracted behind `MapProvider` for geocoding only (see §4) — client-side map rendering talks to the Google Maps SDK directly inside map components |
| Routing | Google Directions API (default) | Same vendor as maps reduces integration surface; abstracted behind `RoutingProvider` so it can move to Mapbox/OSRM without touching `RouteService` |
| AI | OpenAI API, server-side only | Tool-calling models with structured outputs; abstracted behind `AIProvider` |
| Notifications | Telegram Bot API | Matches spec; abstracted behind `TelegramProvider`, dispatched through the generic `NotificationService` so email/push can be added later without changing callers |
| Analytics | Console logging (default) | Phase 12; abstracted behind `AnalyticsProvider` (`src/lib/providers/analytics`) — spec §41 explicitly asks to "architect for future PostHog/Google Analytics," not wire up a real one now. Swapping in a real provider is a new class behind the same interface, not a change to any of the 8 event call sites |

## 3. Layered architecture

```
┌─────────────────────────────────────────────────────────┐
│  UI (app/)                                               │
│  Server & client components, bottom nav, video feed, map │
└───────────────────────────┬───────────────────────────────┘
                             │ calls
┌───────────────────────────▼───────────────────────────────┐
│  API layer (app/api/**/route.ts)                          │
│  Thin adapters: parse/validate request (zod), call one    │
│  service, shape the response. No business logic here.     │
└───────────────────────────┬───────────────────────────────┘
                             │ calls
┌───────────────────────────▼───────────────────────────────┐
│  Service layer (src/lib/services/*.ts)                    │
│  PlaceService, VideoService, CreatorService, RouteService, │
│  PricingService, TripService, DriverService, BookingService,│
│  AIService, TelegramService, HotelService, ActivityService,│
│  RestaurantService, NotificationService. Business logic    │
│  + authorization lives here. Framework-agnostic (no        │
│  Next.js request/response objects).                        │
└──────────┬──────────────────────────────┬──────────────────┘
           │ reads/writes                 │ calls
┌──────────▼──────────────┐    ┌──────────▼──────────────────┐
│  Prisma / PostgreSQL     │    │  Provider layer               │
│  (source of truth)       │    │  src/lib/providers/*/types.ts │
└──────────────────────────┘    │  MapProvider, RoutingProvider,│
                                 │  VideoProvider, StorageProvider,│
                                 │  AIProvider, TelegramProvider │
                                 └──────────┬─────────────────┘
                                            │ implements
                                 ┌──────────▼─────────────────┐
                                 │  Vendor SDKs / HTTP clients  │
                                 │  Google Maps, Mux, R2, OpenAI,│
                                 │  Telegram Bot API             │
                                 └───────────────────────────────┘
```

**Dependency rule**: arrows only point downward. UI never imports a
provider directly. Services never import Next.js types. Providers never
import services (that would be a cycle — see §7). A vendor SDK import may
appear in exactly one file: that provider's concrete implementation.

## 4. Provider abstraction pattern

Every third-party dependency the business logic relies on for a *fact* is
behind an interface in `src/lib/providers/<name>/types.ts`. The concrete
implementation (`<name>/google.ts`, `<name>/openai.ts`, ...) is added in
the phase that first needs it and is selected via an env var
(`ROUTING_PROVIDER`, `STORAGE_PROVIDER`, `VIDEO_PROVIDER`) so swapping
vendors never touches a service.

What is *not* abstracted: client-side map rendering (tile styling,
marker/cluster rendering) talks to the Google Maps JavaScript SDK
directly inside map components. Abstracting a rendering widget behind an interface buys
nothing — we abstract data operations business logic depends on
(geocoding, routing), not UI widgets. This is a deliberate scope
boundary, not an oversight.

## 5. Authentication & authorization

- **AuthN**: Auth.js, Credentials provider only as of Phase 3 (email +
  bcrypt-hashed password, `User.passwordHash`) — no external OAuth app was
  needed to unblock video submission / creator applications, which both
  require a real signed-in user. Session strategy is **JWT**, not database
  sessions: Auth.js's Credentials provider requires it (database sessions
  can't represent a Credentials-authenticated user the same way). The
  Prisma adapter is still wired up for its `User`/`Account`/`Session`
  tables so a database-session OAuth provider (Google) can be added later
  as a second provider without a session-model migration. Guest browsing
  is fully supported — session is optional on read endpoints.
- **AuthZ**: enforced in the **service layer**, never trusted from the
  client. Each service method that mutates data takes the acting user's
  id/role as an explicit argument and checks it before writing (see e.g.
  `TripService.updateTrip(tripId, userId, ...)` — ownership is checked
  inside, not in the API route). Admin-only operations (pricing rules,
  driver verification, submission moderation) check `role === "ADMIN"`
  the same way.
- **`src/middleware.ts` is not the authorization boundary** — despite
  this doc previously (incorrectly) claiming it existed since Phase 1, it
  didn't exist at all until Phase 12, and even now it carries no auth
  logic. Every "requires sign-in" redirect is a per-page `auth()` /
  `requireAdminSession()` / `requireDriverSession()` call (see e.g.
  `admin/layout.tsx`, `trip/ai/page.tsx`), not middleware. What
  middleware *does* do (Phase 12): baseline security headers (CSP,
  X-Frame-Options, Referrer-Policy, Permissions-Policy) on every
  response, and a rate-limit check (`src/lib/api/rateLimit.ts`) on the
  three cost-bearing routes named in docs/api.md §4. It's deliberately
  kept free of any import that pulls in Prisma/bcrypt (i.e. the auth
  config), since middleware runs in the Edge runtime and those aren't
  Edge-safe — the rate limiter is keyed by IP, not session, for the same
  reason.
- **One documented exception** (Phase 10, extended Phase 11): `GET
  /api/trip-requests/[id]` is readable by the requesting customer, the
  assigned driver, *or* an admin — identities that don't reduce to
  "scoped by one user id" the way `TripService.getTrip(tripId, userId)`
  does for single-owner resources. `BookingService.getById(tripRequestId)`
  therefore takes no auth argument at all, and the three-way check lives
  in the route (and the matching page) instead, using
  `TripRequestDTO.userId`/`driverId`, a `Driver.userId` lookup, and
  `session.user.role === "ADMIN"`. `updateStatus` keeps the usual pattern
  (`actorUserId` argument, checked inside the service).
- **Driver role**: `Driver.userId` links a `DRIVER`-role `User` to their
  `Driver` profile (nullable — most drivers aren't app users yet, per
  spec §27 "initially driver assignment may be manually managed").
  `requireDriverSession()` (`src/lib/auth/guards.ts`) resolves a signed-in
  session to its `Driver.id`, returning `null` if the role isn't
  `DRIVER` or no linked profile exists — never guessed or auto-created.
- **Admin UI** (`src/app/admin/**`, Phase 11): the whole route group sits
  behind one `requireAdminSession()` check in `admin/layout.tsx`, not
  per-page — a page under `/admin` never re-checks the role itself. Admin
  API routes still each call `requireAdminSession()` independently,
  since a route can be hit directly without ever rendering the layout.
  Every "admin write" method added this phase (`PlaceService.createPlace`,
  `HotelService.createHotel`, `DriverService.listAll`, etc.) still takes
  the acting admin's id where the write needs an audit trail (e.g.
  `DriverService.verify(driverId, adminUserId)`), matching the existing
  AuthZ pattern above — the admin gate gets you into `/admin`, it isn't a
  substitute for that per-write attribution.

## 6. Storage & video architecture

- Images (place photos, driver/creator avatars) go through
  `StorageProvider` → signed upload URL → client uploads directly →
  object key saved on the entity.
- Videos go through `VideoProvider` → direct-upload URL → vendor
  transcodes → webhook (added in Phase 3) flips the `VideoSubmission`/
  `Video` status once the asset is `ready`. The app never proxies video
  bytes through its own server.
- One video per place is `Video.status = PUBLISHED` and referenced by
  `Place.featuredVideoId`; additional approved videos stay attached to
  the place for future use (spec §10) without being the feed's featured
  clip.

## 7. Risk review (circular dependencies, bad abstractions, security)

**Circular dependencies** — checked by construction via the layering in
§3: services may import other services' *types* (e.g. `ai.service.ts`
imports DTOs from `place.service.ts`, `route.service.ts`, etc. — see §8)
but the reverse never happens; `AIService` is a leaf consumer, nothing
depends on it. Providers never import services. This was verified by
inspecting every import in `src/lib/services/*.ts` and
`src/lib/providers/**/*.ts` — the dependency graph is a DAG.

**Bad abstractions avoided**:
- No single "GodService" — each service in §3 owns one entity family, per
  spec §7.
- `RouteService`/`PricingService` are the only source of distance,
  duration, and cost. `AIService`'s `calculate_*` tools are thin
  delegations, not reimplementations — this is the concrete mechanism
  that prevents the AI from fabricating numbers (spec §32, §34).
- The AI provider abstraction does not leak OpenAI-specific concepts
  (e.g. `tool_choice` enums, response `id`s) into `AIService` — see
  `src/lib/providers/ai/types.ts`.

**Security**:
- `OPENAI_API_KEY`, `TELEGRAM_BOT_TOKEN`, storage secret keys, and the
  routing provider key are server-only env vars (no `NEXT_PUBLIC_`
  prefix) — only `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY` is client-exposed. It
  must be locked down with **HTTP referrer restrictions** in Google Cloud
  Console (Credentials → the key → Application restrictions) scoped to
  this app's domain(s); an unrestricted client-exposed Google key is a
  billing/abuse risk in a way a domain-restricted one isn't. The
  server-side `GOOGLE_MAPS_SERVER_API_KEY` (geocoding) should be a
  *separate* key restricted by IP/API instead, never the same key reused
  across both surfaces in production.
- All mutating service methods take the acting user id and re-check
  ownership/role server-side (§5) — the client is never trusted to
  self-report identity or role.
- Upload endpoints (Phase 3) validate content-type and size server-side
  before issuing a signed URL, and never accept arbitrary vendor URLs
  from the client.
- `VideoSubmission.ownershipConfirmed` is required before a submission
  can be reviewed, enforcing the spec §15 consent checkbox at the data
  layer, not just the UI.

## 8. Cross-service dependency map (as designed)

```
AIService        → PlaceService, RouteService, PricingService,
                    HotelService, ActivityService, RestaurantService,
                    DriverService, TripService   (tool delegation only)
TripService       → RouteService, PricingService (summary aggregation)
BookingService     → TripService, DriverService, NotificationService
NotificationService → TelegramService (channel dispatch)
TelegramService    → BookingService types only (no back-dependency)
VideoService       → CreatorService types only (attribution)
```

No entry in this table is bidirectional.

## 9. Environment & config

All vendor credentials and toggles live in `.env` (see `.env.example`).
`ROUTING_PROVIDER`, `STORAGE_PROVIDER`, `VIDEO_PROVIDER` select the
concrete provider implementation at startup; adding a vendor means
adding one file under the matching `providers/<name>/` folder and one
`case` in that folder's factory function — never touching a service.

## 10. What Phase 0 deliberately does not include

No app shell, no pages, no API route implementations, no provider
implementations (only interfaces), no seed data. Those are Phase 1
onward per the phase plan.

## 11. SEO, PWA, and production hardening (Phase 12)

- **SEO**: `generateMetadata` on `/places/[slug]`, the new `/regions/[slug]`
  and `/categories/[slug]` pages (spec §42 names these three URL
  patterns explicitly — neither region nor category page existed before
  this phase, only their `/api/*` data routes did), each with
  title/description/OpenGraph/canonical. Root `layout.tsx` sets
  `metadataBase` plus site-wide OG/Twitter defaults. `sitemap.ts` and
  `robots.ts` use Next's App Router metadata file conventions (not
  hand-written XML/text) and only enumerate real, published,
  publicly-reachable content — never DRAFT/ARCHIVED places or
  auth-gated routes.
- **PWA**: `manifest.ts` plus `icon.tsx`/`apple-icon.tsx`/
  `icons/192/route.tsx`/`icons/512/route.tsx`, all generated at request
  time via `next/og`'s `ImageResponse` — no binary asset is checked into
  the repo, since none existed and none could be hand-authored. A
  hand-written `public/sw.js` caches only the static shell (`/`,
  `/discover`, the manifest) and explicitly never touches `/api/**` or
  any personalized route; registered from `ServiceWorkerRegister.tsx`,
  production-only (a service worker actively fights Next's dev-mode HMR).
- **Error boundaries**: `error.tsx` (route-level), `global-error.tsx`
  (root-layout-level, self-contained — can't use app components since
  the layout that would provide them is what failed), `not-found.tsx`.
  None of these existed before this phase; a thrown error or a 404
  previously fell through to Next's unstyled default page.
- **Caching**: `jsonCached()` (`src/lib/api/response.ts`) adds a
  `Cache-Control` header alongside the usual `{ data }` envelope — used
  only on Public, non-personalized catalog reads (places/regions/
  categories/hotels/activities/restaurants/drivers search). Never used
  on anything Owner/Admin/User-scoped, and never on a route with a write
  side effect (a cached response means the handler doesn't run again
  until the cache expires, silently skipping whatever it was supposed to
  do).
- **Database/video optimization**: reviewed against actual query
  patterns this phase and found already solid from earlier phases — the
  PostGIS GIST index on `Place.location`, `@@index` on every
  high-traffic foreign key/status column, and the video feed's
  `preload={active ? "auto" : "none"}` (spec §45 "only preload current/
  next video") were all already in place. No new migration was needed.

## 12. Internationalization (spec §43)

- **Library**: `next-intl`, used in its "no i18n routing" mode — there is
  no `[locale]` route segment and no locale prefix in any URL. This was a
  deliberate choice over URL-prefixed locales (e.g. `/ka/places/...`):
  the app's ~108 routes, `sitemap.ts`, `robots.ts`, and canonical URLs
  all stay exactly as they were pre-i18n, and the tradeoff (each URL can
  only be indexed under one language's chrome) was acceptable since the
  underlying place/region/category content is English-only regardless of
  UI language (see below).
- **Locale resolution** (`src/i18n/request.ts`), in priority order:
  1. The `NEXT_LOCALE` cookie — an explicit choice made on this
     device/browser via the Profile tab's language switcher
     (`src/components/shell/LanguageSwitcher.tsx` →
     `POST /api/user/locale`).
  2. A signed-in user's saved `User.locale` (the column already existed
     in the schema, unused until now) — lets a returning signed-in
     user's preference follow them to a new device with no cookie set
     yet.
  3. The `Accept-Language` header.
  4. `en`, the default.
- **Message files**: one JSON file per feature area per locale —
  `messages/{en,ka,ru}/{namespace}.json` (19 namespaces: `common`, `nav`,
  `meta`, `discover`, `map`, `trip`, `tripRequest`, `saved`, `profile`,
  `place`, `region`, `category`, `auth`, `submit`, `creators`, `driver`,
  `ai`, `errors`, `apiErrors`) — merged in `src/i18n/request.ts`. Server
  Components/Route Handlers use `getTranslations()`/`getLocale()` from
  `next-intl/server`; Client Components use `useTranslations()`/
  `useLocale()` from `next-intl`.
- **Scope**: UI chrome only — navigation, buttons, labels, form fields,
  empty states, error messages (including the top-level `message` string
  in every API route's `jsonError()` call). AI travel agent replies are
  also locale-aware: `AIService.buildSystemPrompt` appends a language
  directive to the system prompt per request (see `docs/ai-architecture.md`
  if this needs updating). `src/app/global-error.tsx` is a deliberate
  exception and stays hardcoded English — it fires when the root layout
  itself (which provides `NextIntlClientProvider`) has failed, so it
  can't depend on the same provider tree it's a fallback for.
- **Admin exemption**: `src/app/admin/**` stays English-only (internal
  tool). `src/app/admin/layout.tsx` wraps its content in its own
  `<NextIntlClientProvider locale="en" messages={enMessages}>`
  (`src/i18n/enMessages.ts`) fixed to English, independent of the site
  visitor's chosen language — needed because a few traveler-facing
  components rendered inside admin panels (e.g. `PlacePicker`) call
  `useTranslations()` and would otherwise throw without a provider.
- **Database content — schema ready, not yet populated**: `Place`,
  `Region`, and `Category` each got nullable `nameKa`/`nameRu` (+
  `shortDescriptionKa`/`shortDescriptionRu`/`descriptionKa`/
  `descriptionRu` on `Place`; `descriptionKa`/`descriptionRu` on
  `Region`) columns via migration
  `20260815120000_place_region_category_translations`. A `localize()`
  helper (`src/lib/utils/localize.ts`) prefers the locale-suffixed value
  when present, falling back to the English base field otherwise;
  `PlaceService`'s read methods and the region/category page lookups all
  take an **optional** `locale` parameter that threads through to it.
  Every one of these new columns is `null` today — no content-translation
  pass has been done — so place/region/category names and descriptions
  render in English regardless of the selected UI language, exactly as
  before this phase. This is a deliberate, separate follow-up (translating
  real place descriptions accurately is a content effort, not a
  side-effect of a UI localization pass).
