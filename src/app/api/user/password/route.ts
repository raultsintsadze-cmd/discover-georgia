import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { requireUserSession } from "@/lib/auth/guards";
import { passwordService } from "@/lib/services/impl/PasswordService";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const bodySchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(72),
});

export async function PATCH(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const session = await requireUserSession();
  if (!session) {
    return jsonError("UNAUTHENTICATED", t("signInToChangePassword"), 401);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidPasswordChangeDetails"), 400, zodIssuesToFields(parsed.error.issues));
  }

  const result = await passwordService.changePassword(session.user.id, parsed.data.currentPassword, parsed.data.newPassword);
  if (!result.ok) {
    const message = result.reason === "no_password_set" ? t("noPasswordSet") : t("incorrectCurrentPassword");
    return jsonError(result.reason === "no_password_set" ? "NO_PASSWORD_SET" : "INCORRECT_PASSWORD", message, 400);
  }

  return jsonOk({ changed: true });
}
