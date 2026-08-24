export type ResetPasswordResult = { ok: true; email: string } | { ok: false; reason: "invalid_or_expired" };
export type ChangePasswordResult = { ok: true } | { ok: false; reason: "incorrect_current_password" | "no_password_set" };

/**
 * Forgot-password (email link) and logged-in change-password, together
 * since both ultimately do the same thing (verify something, then
 * overwrite User.passwordHash) — splitting them into two services would
 * just duplicate the hashing/validation rules.
 */
export interface PasswordService {
  /**
   * Always resolves, whether or not the email matches an account — never
   * lets a caller distinguish "no such user" from "email sent", so this
   * endpoint can't be used to enumerate registered emails.
   */
  requestReset(email: string): Promise<void>;
  resetPassword(rawToken: string, newPassword: string): Promise<ResetPasswordResult>;
  changePassword(userId: string, currentPassword: string, newPassword: string): Promise<ChangePasswordResult>;
}
