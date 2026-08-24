"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Mail } from "lucide-react";
import { BackHeader } from "@/components/shell/BackHeader";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";

export default function ForgotPasswordPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [sent, setSent] = React.useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      // No error branch on the fetch result — the endpoint always
      // resolves 200 by design (see /api/auth/forgot-password), so
      // "sent" reflects the request completing, not that an account
      // was actually found.
      await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pb-12">
      <BackHeader title={t("forgotPasswordTitle")} backHref="/discover" />

      <div className="px-5 pt-3">
        {sent ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-tint text-accent-600">
                <Mail className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <p className="text-h3 text-ink-900">{t("forgotPasswordSentTitle")}</p>
                <p className="mt-1 text-body-sm text-ink-500">{t("forgotPasswordSentDescription")}</p>
              </div>
              <Link href="/discover" className="text-body-sm font-medium text-accent-500">
                {t("backToSignIn")}
              </Link>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-body-sm text-ink-500">{t("forgotPasswordDescription")}</p>
            <Field label={t("emailLabel")} required>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="email"
                  required
                />
              )}
            </Field>
            <Button type="submit" loading={loading}>
              {t("forgotPasswordSubmit")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
