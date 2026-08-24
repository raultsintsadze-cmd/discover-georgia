import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { passwordService } from "@/lib/services/impl/PasswordService";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const bodySchema = z.object({ email: z.string().trim().toLowerCase().email() });

/**
 * Always responds 200 with the same body whether or not the email
 * matches an account — see PasswordService.requestReset doc. Never turn
 * a "user not found" case into a different status/message here, or the
 * enumeration protection in the service is undone at this layer.
 */
export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidEmail"), 400, zodIssuesToFields(parsed.error.issues));
  }

  await passwordService.requestReset(parsed.data.email);

  return jsonOk({ sent: true });
}
