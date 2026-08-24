import "server-only";
import { Resend } from "resend";
import type { EmailProvider } from "./types";

export class ResendEmailProvider implements EmailProvider {
  private readonly client: Resend;

  constructor(
    apiKey: string,
    private readonly from: string
  ) {
    this.client = new Resend(apiKey);
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    const { error } = await this.client.emails.send({
      from: this.from,
      to,
      subject: "Reset your Discover Georgia password",
      html: `
        <p>Someone requested a password reset for your Discover Georgia account.</p>
        <p><a href="${resetUrl}">Click here to set a new password</a>. This link expires in 1 hour.</p>
        <p>If you didn't request this, you can safely ignore this email — your password won't change.</p>
      `,
    });
    if (error) {
      throw new Error(`Resend send failed: ${error.message}`);
    }
  }
}

export const emailProvider: EmailProvider = new ResendEmailProvider(
  process.env.RESEND_API_KEY ?? "",
  process.env.EMAIL_FROM ?? "Discover Georgia <onboarding@resend.dev>"
);
