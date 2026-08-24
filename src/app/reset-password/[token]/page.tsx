"use client";

import * as React from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { BackHeader } from "@/components/shell/BackHeader";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

export default function ResetPasswordPage() {
  const t = useTranslations("auth");
  const { toast } = useToast();
  const router = useRouter();
  const params = useParams<{ token: string }>();
  const [newPassword, setNewPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [invalid, setInvalid] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: params.token, newPassword }),
      });
      const body = await res.json();

      if (!res.ok) {
        if (res.status === 400 && body?.error?.code === "INVALID_TOKEN") {
          setInvalid(true);
        } else {
          setError(body?.error?.message ?? t("genericError"));
        }
        return;
      }

      // The reset already proved control of the account (a token only a
      // legitimate password-reset email could have contained) — signing
      // in here saves the user from immediately having to type the
      // password they just chose back into a separate sign-in form.
      await signIn("credentials", { email: body.data.email, password: newPassword, redirect: false });
      toast({ title: t("resetPasswordSuccessToast"), variant: "success" });
      router.push("/profile");
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-md pb-12">
      <BackHeader title={t("resetPasswordTitle")} backHref="/discover" />

      <div className="px-5 pt-3">
        {invalid ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-danger-tint text-danger-500">
                <AlertTriangle className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <p className="text-h3 text-ink-900">{t("resetLinkInvalidTitle")}</p>
                <p className="mt-1 text-body-sm text-ink-500">{t("resetLinkInvalidDescription")}</p>
              </div>
              <Link href="/forgot-password" className="w-full">
                <Button className="w-full">{t("requestNewLink")}</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Field label={t("newPasswordLabel")} required helperText={t("passwordHelper")} errorText={error ?? undefined}>
              {(fieldProps) => (
                <Input
                  {...fieldProps}
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              )}
            </Field>
            <Button type="submit" loading={loading}>
              {t("resetPasswordSubmit")}
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
