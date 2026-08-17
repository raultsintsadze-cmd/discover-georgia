# Discover Georgia — Database

Schema source of truth: [`prisma/schema.prisma`](../prisma/schema.prisma).
This document explains the *why* behind non-obvious modeling choices and
the geospatial/indexing strategy; field-by-field detail lives in the
schema itself (it's short enough to read directly).

## 1. Entity groups

| Group | Models |
|---|---|
| Auth | `User`, `Account`, `Session`, `VerificationToken`, `Profile` |
| People | `Creator`, `Driver`, `DriverRegion` |
| Taxonomy | `Region`, `Category` |
| Content | `Place`, `Video`, `VideoSubmission` |
| Saving | `SavedPlace` |
| Trips | `Trip`, `TripDay`, `TripPlace`, `Route` |
| Supply | `Hotel`, `Restaurant`, `Activity` |
| Commerce | `PricingRule`, `TripRequest`, `Notification` |
| AI | `AiConversation`, `AiMessage` |

## 2. Geospatial strategy

`Place`, `Hotel`, `Restaurant`, and `Activity` each store plain
`latitude`/`longitude` floats (simple to read/write, no PostGIS knowledge
needed for ordinary CRUD) **plus** a `location geography(Point, 4326)`
column on `Place` (`Unsupported("geography(Point, 4326)")` in Prisma,
since Prisma has no native geography type).

- The `location` column is kept in sync with `latitude`/`longitude` by a
  Postgres trigger (added in the first migration, Phase 2) — application
  code always writes lat/lng; it never writes `location` directly.
- A `GIST` index on `location` backs `PlaceService.getNearby()`
  (`ST_DWithin` for "within N km" and `ST_Distance` for sort-by-distance),
  run via `$queryRaw` in the Prisma client since Prisma's query builder
  doesn't support PostGIS operators.
- Hotels/Restaurants/Activities are lower query volume (looked up by
  `nearPlaceId`/`regionId`, not broad geospatial search), so they skip the
  `geography` column and trigger — plain lat/lng is enough. If they later
  need radius search, add the same pattern.
- **Coordinates are never invented.** Seed data and admin-entered places
  must carry real GPS coordinates; `PlaceService` has no fallback that
  guesses a location.

## 3. Why some entities are split the way they are

- **`Profile` is separate from `User`**: keeps the Auth.js user table
  lean (Auth.js reads/writes `User`/`Account`/`Session` directly via its
  Prisma adapter) and lets travel preferences evolve independently of
  auth schema.
- **`VideoSubmission` is separate from `Video`**: a submission may
  reference a *new* place that doesn't exist yet (`placeName` free text)
  or an existing one (`existingPlaceId`). Only on approval does
  `VideoService` create/attach a `Video` row — never before, per the
  "never publish automatically" rule (spec §15). **As of Phase 3**,
  `approveSubmission` requires `existingPlaceId` to be set — the
  submission form only lets users pick from the real places catalog
  (`PlacePicker`, backed by `/api/places`), so every submission that
  reaches an admin already resolves to a place. `placeName`/`latitude`/
  `longitude`/`categoryId`/`regionId` stay on the schema for a genuine
  "suggest a brand-new place" flow, but creating that `Place` is an admin
  CRUD action (Phase 11), not something approval does implicitly — a
  submission with no linked place cannot be approved yet.
- **`Route` rows belong to a `Trip`, not a `Place` pair globally**: the
  same Tbilisi→Telavi leg is recalculated per trip rather than cached
  globally, because waypoint order and profile can differ. (A future
  segment-level cache keyed on `(originPlaceId, destinationPlaceId)` is a
  safe optimization to add later without a schema change — see
  `RouteService.getSegment`.)
  **Route invalidation**: `TripService.addPlace`/`removePlace`/
  `reorderPlaces` each delete the trip's `Route` rows as part of the same
  mutation (Phase 5). A cached route only reflects one specific ordered
  sequence of places — any edit to that sequence makes the cached
  distance/duration wrong, and showing a stale number as current would
  violate the same "never fabricate" rule the AI layer is held to. This is
  why `TripSummary.routeComputed` can flip back to `false` right after a
  successful edit: it's not a bug, it's the honesty mechanism.
- **`TripRequest.itinerarySnapshot` is a JSON freeze**, not a live
  reference to `TripDay`/`TripPlace`: once a customer requests a trip,
  editing the trip afterward must not silently change what the driver
  already agreed to.
- **`TripRequest.idempotencyKey`** (Phase 10) is a nullable field with a
  `@@unique([userId, idempotencyKey])` index, not its own table — Postgres
  treats multiple `NULL`s as distinct, so every request created before
  this existed (or without a key) coexists fine, and one client-generated
  key per "Request this trip" tap is enough to dedupe a retried POST on a
  flaky connection (see docs/api.md §1).
- **`Trip.preferredDriverId` vs `TripRequest.driverId`** (Phase 6): the
  former is the user's in-progress choice while browsing driver cards on
  the Budget tab — casual, changeable, nullable — while the latter (Phase
  10) freezes the driver for a confirmed booking. Deliberately two
  different fields on two different models rather than one, so a later
  driver-selection change on the trip can never retroactively alter a
  request that's already gone to a driver.
- **`Restaurant` and `Activity` are separate models** even though their
  fields overlap heavily: restaurants carry `cuisine`/`priceLevel`
  (meal-shaped), activities carry a `category` enum
  (`TOUR`/`WINE_TASTING`/`ADVENTURE`/`CULTURE`/`GENERAL`) covering tours,
  wine tastings, and adventures in one table (spec §8 lists `restaurants`
  and `activities` as the two DB entities; §38's tours/wine/adventure are
  sub-categories of "activities", not separate tables).
- **`AiMessage` stores `toolName`/`toolInput`/`toolOutput` per row**: this
  is the audit trail that lets us prove, after the fact, that a given AI
  answer came from a tool call (a `RouteService`/`PricingService` result)
  rather than free-text generation — the mechanism behind the "AI must
  not fabricate" requirement (spec §32).

## 4. Enums vs free text

Status-like fields are enums (`PlaceStatus`, `VideoStatus`,
`ModerationStatus`, `TripStatus`, `TripRequestStatus`,
`DriverVerificationStatus`, `DriverAvailabilityStatus`,
`NotificationStatus`) so invalid states are rejected at the database
level, not just in application code. Open-ended descriptive fields
(`entranceFee`, `vehicle`, `cuisine`) stay as strings — enumerating every
possible value would be premature.

## 5. Indexes

Beyond primary keys and the `Place.location` GIST index (§2):

- Foreign key columns used in hot lookups are indexed explicitly
  (`Place.regionId`, `Place.categoryId`, `Video.placeId`,
  `TripPlace.tripDayId`, `Route.tripId`, `TripRequest.driverId`, etc.) —
  Postgres does not auto-index FK columns.
- Status columns queried by the admin panel and moderation flows are
  indexed (`Place.status`, `Video.status`, `VideoSubmission.status`,
  `Driver.verificationStatus + availabilityStatus` composite,
  `TripRequest.status`, `Notification.status`).
- Unique constraints enforce invariants: one `SavedPlace` per
  `(userId, placeId)`, one `TripDay` per `(tripId, dayNumber)`, one
  `TripPlace` per `(tripDayId, placeId)`, one `Video` per
  `sourceSubmissionId`, one featured `Video` per `Place`
  (`Place.featuredVideoId` unique).

## 6. Migration strategy

Prisma Migrate, forward-only migrations committed to `prisma/migrations/`.
The `postgis` extension is declared in `datasource.extensions` so
`prisma migrate dev` creates it automatically on a fresh database. The
`location` sync trigger and the GIST index are added as a raw-SQL section
inside the first migration that introduces `Place` (Prisma migrations
support hand-edited SQL blocks for exactly this kind of
extension-specific DDL).
