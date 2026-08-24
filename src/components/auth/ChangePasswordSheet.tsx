"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { BottomSheet, BottomSheetContent } from "@/components/ui/BottomSheet";
import { Field } from "@/components/ui/Field";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export interface ChangePasswordSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ChangePasswordSheet({ open, onOpenChange }: ChangePasswordSheetProps) {
  const t = useTranslations("profile");
  const tAuth = useTranslations("auth");
  const { toast } = useToast();
  const [currentPassword, setCurrentPassword] = React.useState("");
  const [newPassword, setNewPassword] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  function reset() {
    setCurrentPassword("");
    setNewPassword("");
    setError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/user/password", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? tAuth("genericError"));
        return;
      }

      toast({ title: t("changePasswordSuccessToast"), variant: "success" });
      reset();
      onOpenChange(false);
    } catch {
      setError(tAuth("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent title={t("changePasswordTitle")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label={t("currentPasswordLabel")} required>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            )}
          </Field>
          <Field label={t("newPasswordLabel")} required helperText={tAuth("passwordHelper")} errorText={error ?? undefined}>
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
          <Button type="submit" loading={loading} className="mt-1">
            {t("changePasswordSubmit")}
          </Button>
        </form>
      </BottomSheetContent>
    </BottomSheet>
  );
}
