/**
 * Parses a degrees-minutes-seconds coordinate pair, e.g.
 * `41°35'59.3"N 41°57'50.3"E` — the format Google Maps and most GPS apps
 * show when you right-click/long-press a point, so it's what a submitter
 * pasting a location will actually have on their clipboard, not decimal
 * degrees. Accepts straight or "prime"/"double-prime" quote marks for
 * minutes/seconds, comma-or-space between the lat/lon halves, and either
 * ° or a bare space before the degree value.
 */
const DMS_PART = String.raw`(\d{1,3})[°:\s]\s*(\d{1,2})[''′:\s]\s*([\d.]+)["″]?\s*([NSEWnsew])`;
const DMS_PATTERN = new RegExp(`^${DMS_PART}[,\\s]+${DMS_PART}$`);

export interface DecimalCoordinate {
  latitude: number;
  longitude: number;
}

function toDecimal(deg: number, min: number, sec: number, dir: string): number | null {
  if (!Number.isFinite(deg) || !Number.isFinite(min) || !Number.isFinite(sec)) return null;
  if (min >= 60 || sec >= 60) return null;
  const decimal = deg + min / 60 + sec / 3600;
  return dir === "S" || dir === "W" ? -decimal : decimal;
}

export function parseDMSCoordinate(input: string): DecimalCoordinate | null {
  const match = input.trim().match(DMS_PATTERN);
  if (!match) return null;

  const [, aDeg, aMin, aSec, aDir, bDeg, bMin, bSec, bDir] = match;
  if (!aDeg || !aMin || !aSec || !aDir || !bDeg || !bMin || !bSec || !bDir) return null;
  const dirA = aDir.toUpperCase();
  const dirB = bDir.toUpperCase();

  // Accept either order (lat-then-lon is the overwhelmingly common case,
  // matching the N/S-before-E/W example this was built for, but this
  // costs nothing extra to support and avoids a confusing rejection if
  // someone pastes it the other way round).
  const isLatFirst = dirA === "N" || dirA === "S";
  const isLonFirst = dirA === "E" || dirA === "W";
  if (!isLatFirst && !isLonFirst) return null;

  const [latDeg, latMin, latSec, latDir, lonDeg, lonMin, lonSec, lonDir] = isLatFirst
    ? [aDeg, aMin, aSec, dirA, bDeg, bMin, bSec, dirB]
    : [bDeg, bMin, bSec, dirB, aDeg, aMin, aSec, dirA];

  if ((latDir !== "N" && latDir !== "S") || (lonDir !== "E" && lonDir !== "W")) return null;

  const latitude = toDecimal(Number(latDeg), Number(latMin), Number(latSec), latDir);
  const longitude = toDecimal(Number(lonDeg), Number(lonMin), Number(lonSec), lonDir);
  if (latitude === null || longitude === null) return null;
  if (Math.abs(latitude) > 90 || Math.abs(longitude) > 180) return null;

  return { latitude, longitude };
}
