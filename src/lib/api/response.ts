import { NextResponse } from "next/server";
import type { ZodIssue } from "zod";

/** Standard success/error envelope — see docs/api.md §1. */
export function jsonOk<T>(data: T, init?: ResponseInit) {
  return NextResponse.json({ data }, init);
}

/**
 * Same envelope, plus a Cache-Control header — only for Public, non-
 * personalized GET responses (catalog listings/search). Never use this
 * for anything Owner/Admin/User-scoped, and never for a route with a
 * write side effect (e.g. a view-count increment), since a cached
 * response means the handler — and that side effect — simply doesn't
 * run again until the cache expires.
 */
export function jsonCached<T>(data: T, maxAgeSeconds: number) {
  return jsonOk(data, {
    headers: { "Cache-Control": `public, max-age=${maxAgeSeconds}, stale-while-revalidate=${maxAgeSeconds * 5}` },
  });
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  fields?: Record<string, string>
) {
  return NextResponse.json({ error: { code, message, fields } }, { status });
}

export function zodIssuesToFields(issues: ZodIssue[]): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.join(".") || "_";
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/**
 * Maps a service-layer Error's message to an HTTP response. Our services
 * throw plain `Error`s with human-readable messages (see TripService) —
 * this is the one place that turns "Trip not found" into 404 vs. a
 * business-rule violation into 409, so routes don't each reinvent it.
 */
export function serviceErrorResponse(err: unknown, fallbackMessage = "Request could not be processed") {
  const message = err instanceof Error ? err.message : fallbackMessage;
  if (/not found/i.test(message)) {
    return jsonError("NOT_FOUND", message, 404);
  }
  if (/not authorized/i.test(message)) {
    return jsonError("FORBIDDEN", message, 403);
  }
  return jsonError("CONFLICT", message, 409);
}
