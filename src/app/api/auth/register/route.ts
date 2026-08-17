import { NextRequest } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/client";
import { jsonOk, jsonError, zodIssuesToFields } from "@/lib/api/response";

const BCRYPT_ROUNDS = 10;

const bodySchema = z.object({
  name: z.string().trim().min(1).max(100),
  email: z.string().trim().toLowerCase().email(),
  // bcrypt silently ignores bytes past 72 — cap well under that.
  password: z.string().min(8).max(72),
});

export async function POST(request: NextRequest) {
  const t = await getTranslations("apiErrors");
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return jsonError("VALIDATION_ERROR", t("invalidRegistrationDetails"), 400, zodIssuesToFields(parsed.error.issues));
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return jsonError("CONFLICT", t("accountAlreadyExists"), 409);
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const user = await prisma.user.create({
    data: { name, email, passwordHash },
    select: { id: true, email: true, name: true },
  });

  return jsonOk(user, { status: 201 });
}
