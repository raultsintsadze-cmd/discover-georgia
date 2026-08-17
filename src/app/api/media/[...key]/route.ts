import { NextRequest, NextResponse } from "next/server";
import { storageProvider } from "@/lib/providers/storage/r2";

/**
 * Streams an object straight out of R2. Only reachable path for playback
 * while STORAGE_PUBLIC_BASE_URL is unset — see storageProvider.getPublicUrl.
 * No auth: keys are unguessable cuids, and this is no more exposed than
 * any externally-pasted video URL already was.
 */
export async function GET(request: NextRequest, { params }: { params: Promise<{ key: string[] }> }) {
  const { key: keyParts } = await params;
  const key = keyParts.join("/");
  const range = request.headers.get("range") ?? undefined;

  let object;
  try {
    object = await storageProvider.getObject(key, range);
  } catch {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Media not found" } }, { status: 404 });
  }

  const headers = new Headers({
    "Content-Type": object.contentType ?? "application/octet-stream",
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=31536000, immutable",
  });
  if (object.contentLength !== null) headers.set("Content-Length", String(object.contentLength));
  if (object.contentRange) headers.set("Content-Range", object.contentRange);

  return new NextResponse(object.body, { status: object.status, headers });
}
