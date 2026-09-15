import { parseDMSCoordinate, type DecimalCoordinate } from "./parseDMSCoordinate";

export type { DecimalCoordinate };

// Generous bounding box covering all of Georgia (incl. Abkhazia/South
// Ossetia) with a little padding for GPS noise/rounding. Used only as an
// order-detection HINT for an ambiguous decimal pair (see
// parseDecimalPair) — never to reject a coordinate outright, since a
// submitter could legitimately paste a point just outside this box.
const GEORGIA_BOUNDS = { latMin: 41.0, latMax: 43.6, lonMin: 39.9, lonMax: 46.8 };

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function toValidCoordinate(latitude: number, longitude: number): DecimalCoordinate | null {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;
  return { latitude, longitude };
}

const NUM = String.raw`-?\d{1,3}(?:\.\d+)?`;

function parseGoogleMapsUrl(input: string): DecimalCoordinate | null {
  // Precise pin coordinate on "place" share links — checked first since
  // it reflects the actual marked point, not just the map's viewport
  // center (which is all "@lat,lon" gives you on a place URL).
  const pin = input.match(new RegExp(`!3d(${NUM})!4d(${NUM})`));
  if (pin?.[1] && pin[2]) return toValidCoordinate(Number(pin[1]), Number(pin[2]));

  const atSign = input.match(new RegExp(`@(${NUM}),(${NUM})`));
  if (atSign?.[1] && atSign[2]) return toValidCoordinate(Number(atSign[1]), Number(atSign[2]));

  const queryParam = input.match(new RegExp(`[?&](?:q|ll)=(${NUM}),(${NUM})`));
  if (queryParam?.[1] && queryParam[2]) return toValidCoordinate(Number(queryParam[1]), Number(queryParam[2]));

  return null;
}

const DECIMAL_PAIR_PATTERN = new RegExp(`^(${NUM})[,\\s]+(${NUM})$`);

function parseDecimalPair(input: string): DecimalCoordinate | null {
  const match = input.match(DECIMAL_PAIR_PATTERN);
  if (!match?.[1] || !match[2]) return null;

  const a = Number(match[1]);
  const b = Number(match[2]);

  const aFitsLat = inRange(a, GEORGIA_BOUNDS.latMin, GEORGIA_BOUNDS.latMax);
  const aFitsLon = inRange(a, GEORGIA_BOUNDS.lonMin, GEORGIA_BOUNDS.lonMax);
  const bFitsLat = inRange(b, GEORGIA_BOUNDS.latMin, GEORGIA_BOUNDS.latMax);
  const bFitsLon = inRange(b, GEORGIA_BOUNDS.lonMin, GEORGIA_BOUNDS.lonMax);

  const givenOrderFits = aFitsLat && bFitsLon; // a=lat, b=lon
  const flippedOrderFits = aFitsLon && bFitsLat; // a=lon, b=lat

  // Only one order keeps both numbers inside Georgia's box -> use it.
  // Georgia's lat band (41.0-43.6) sits inside its lon band (39.9-46.8),
  // so genuinely ambiguous pairs are possible (e.g. Batumi is ~41.6,
  // ~41.6) — when both orders fit, or neither does, default to the
  // universal lat,lon convention rather than guessing further.
  if (flippedOrderFits && !givenOrderFits) {
    return toValidCoordinate(b, a);
  }
  return toValidCoordinate(a, b);
}

/**
 * Parses a location the way a real submitter will actually paste it —
 * decimal degrees, DMS, a pasted Google Maps URL, or a bare decimal pair
 * in either lat,lon or lon,lat order — trying each shape in turn and
 * returning the first that parses. Never partially guesses across
 * formats: a string either cleanly matches one shape or the whole thing
 * is reported as unparseable.
 *
 * Short (maps.app.goo.gl) links are NOT resolved — that needs a
 * server-side redirect follow, deliberately out of scope for now (see
 * VideoSubmissionForm). One of those simply won't match anything below
 * and reports as unparseable, same as any other input we don't recognize.
 */
export function parseCoordinateInput(rawInput: string): DecimalCoordinate | null {
  const input = rawInput.trim();
  if (!input) return null;

  // Covers both URL shapes Google actually hands out: a "/maps" path on
  // the main domain (google.com/maps/@lat,lon,...) and the "maps."
  // subdomain used by the older ?q= share format (maps.google.com/?q=...).
  if (/google\.[a-z.]+\/maps|maps\.google\.[a-z.]+|maps\.app\.goo\.gl/i.test(input)) {
    return parseGoogleMapsUrl(input);
  }

  return parseDMSCoordinate(input) ?? parseDecimalPair(input);
}
