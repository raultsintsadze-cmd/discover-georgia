import "server-only";
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db/client";
import { emailProvider } from "@/lib/providers/email/resend";
import type { PasswordService, ResetPasswordResult, ChangePasswordResult } from "../password.service";

const BCRYPT_ROUNDS = 10;
const TOKEN_TTL_MS = 60 * 60 * 1000; // 1 hour

function hashToken(rawToken: string): string {
  return crypto.createHash("sha256").update(rawToken).digest("hex");
}

export class PasswordServiceImpl implements PasswordService {
  constructor(private readonly appUrl: string) {}

  async requestReset(email: string): Promise<void> {
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    // No user, or an OAuth-only account with nothing to reset — resolve
    // silently either way (see interface doc: never reveals which).
    if (!user) return;

    const rawToken = crypto.randomBytes(32).toString("hex");
    await prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashToken(rawToken),
        expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
      },
    });

    const resetUrl = `${this.appUrl.replace(/\/$/, "")}/reset-password/${rawToken}`;
    // A delivery failure here shouldn't surface as an error to the
    // caller — same "never reveals which case happened" reasoning as
    // above, and matches TelegramService's fire-and-forget-but-logged
    // pattern for third-party notification calls.
    try {
      await emailProvider.sendPasswordReset(email, resetUrl);
    } catch (err) {
      console.error("[password-reset] failed to send email", err);
    }
  }

  async resetPassword(rawToken: string, newPassword: string): Promise<ResetPasswordResult> {
    const tokenHash = hashToken(rawToken);
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { email: true } } },
    });

    if (!record || record.usedAt || record.expiresAt < new Date() || !record.user.email) {
      return { ok: false, reason: "invalid_or_expired" };
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.$transaction([
      prisma.user.update({ where: { id: record.userId }, data: { passwordHash } }),
      prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
      // Any other outstanding reset links for this user are invalidated
      // too — one successful reset should retire every link that was
      // ever emailed, not just the one that was clicked.
      prisma.passwordResetToken.updateMany({
        where: { userId: record.userId, usedAt: null, id: { not: record.id } },
        data: { usedAt: new Date() },
      }),
    ]);

    return { ok: true, email: record.user.email };
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<ChangePasswordResult> {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { passwordHash: true } });
    if (!user?.passwordHash) {
      return { ok: false, reason: "no_password_set" };
    }

    const matches = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!matches) {
      return { ok: false, reason: "incorrect_current_password" };
    }

    const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
    await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
    return { ok: true };
  }
}

export const passwordService: PasswordService = new PasswordServiceImpl(process.env.APP_URL ?? "http://localhost:3000");
