import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { passwordService } from "@/lib/services/impl/PasswordService";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const bodySchema = z.object({
  token: z.string().min(1),
  // Same rule as registration — bcrypt silently ignores bytes past 72.
  newPassword: z.string().min(8).max(72),
});

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidPasswordChangeDetails"), 400, zodIssuesToFields(parsed.error.issues));
  }

  const result = await passwordService.resetPassword(parsed.data.token, parsed.data.newPassword);
  if (!result.ok) {
    return jsonError("INVALID_TOKEN", t("invalidOrExpiredResetToken"), 400);
  }

  // The email, so the client can immediately sign in with the password
  // it just set — the token already proved possession of the inbox, no
  // need to make the user retype their address into a sign-in form next.
  return jsonOk({ email: result.email });
}
