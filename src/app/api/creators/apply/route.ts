import { NextRequest } from "next/server";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { creatorService } from "@/lib/services/impl/CreatorService";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const bodySchema = z.object({
  displayName: z.string().trim().min(1).max(100),
  bio: z.string().trim().max(500).optional(),
  instagram: z.string().trim().max(100).optional(),
  tiktok: z.string().trim().max(100).optional(),
});

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const session = await auth();
  if (!session?.user) {
    return jsonError("UNAUTHENTICATED", t("signInToApplyAsCreator"), 401);
  }

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidApplication"), 400, zodIssuesToFields(parsed.error.issues));
  }

  const { creatorId } = await creatorService.applyAsCreator(session.user.id, parsed.data);
  return jsonOk({ creatorId }, { status: 201 });
}
