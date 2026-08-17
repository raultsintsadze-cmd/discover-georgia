import { NextRequest } from "next/server";
import { z } from "zod";
import { randomUUID } from "crypto";
import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { storageProvider } from "@/lib/providers/storage/r2";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

// Keep in sync with VideoSubmissionForm's client-side accept list.
const CONTENT_TYPE_EXTENSIONS: Record<string, string> = {
  "video/mp4": "mp4",
  "video/quicktime": "mov",
  "video/webm": "webm",
};

const bodySchema = z.object({
  contentType: z.enum(Object.keys(CONTENT_TYPE_EXTENSIONS) as [string, ...string[]]),
});

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToSubmitVideo"), 401);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidVideoContentType"), 400, zodIssuesToFields(parsed.error.issues));
  }

  const { contentType } = parsed.data;
  const extension = CONTENT_TYPE_EXTENSIONS[contentType];
  const key = `videos/${session.user.id}/${randomUUID()}.${extension}`;

  const { uploadUrl, publicUrl } = await storageProvider.getSignedUploadUrl(key, contentType);
  return jsonOk({ uploadUrl, publicUrl });
}
