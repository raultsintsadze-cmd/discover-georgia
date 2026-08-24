"use client";

import * as React from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signIn } from "next-auth/react";
import { BottomSheet, BottomSheetContent } from "@/components/ui/BottomSheet";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

type Mode = "signin" | "signup";

export interface AuthSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function AuthSheet({ open, onOpenChange, onSuccess }: AuthSheetProps) {
  const t = useTranslations("auth");
  const { toast } = useToast();
  const [mode, setMode] = React.useState<Mode>("signin");
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setName("");
    setEmail("");
    setPassword("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const body = await res.json();
        if (!res.ok) {
          setError(body?.error?.message ?? t("signUpError"));
          return;
        }
      }

      const result = await signIn("credentials", { email, password, redirect: false });
      if (result?.error) {
        setError(t("invalidCredentials"));
        return;
      }

      toast({ title: mode === "signup" ? t("welcomeToast") : t("signedInToast"), variant: "success" });
      reset();
      onOpenChange(false);
      onSuccess?.();
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent title={mode === "signin" ? t("signInTitle") : t("signUpTitle")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {mode === "signup" && (
            <Field label={t("nameLabel")} required>
              {(fieldProps) => (
                <Input {...fieldProps} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required />
              )}
            </Field>
          )}
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
          <Field
            label={t("passwordLabel")}
            required
            helperText={mode === "signup" ? t("passwordHelper") : undefined}
            errorText={error ?? undefined}
          >
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                minLength={8}
                required
              />
            )}
          </Field>

          {mode === "signin" && (
            <Link
              href="/forgot-password"
              onClick={() => onOpenChange(false)}
              className="-mt-2 self-end text-body-sm text-ink-500"
            >
              {t("forgotPasswordLink")}
            </Link>
          )}

          <Button type="submit" loading={loading} className="mt-1">
            {mode === "signin" ? t("signInSubmit") : t("signUpSubmit")}
          </Button>

          <button
            type="button"
            onClick={() => {
              setMode(mode === "signin" ? "signup" : "signin");
              setError(null);
            }}
            className="text-center text-body-sm text-ink-500"
          >
            {mode === "signin" ? t("switchToSignUp") : t("switchToSignIn")}
          </button>
        </form>
      </BottomSheetContent>
    </BottomSheet>
  );
}
