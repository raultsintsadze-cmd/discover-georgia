"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export function CreatorApplicationForm() {
  const t = useTranslations("creators");
  const router = useRouter();
  const { toast } = useToast();

  const [displayName, setDisplayName] = React.useState("");
  const [bio, setBio] = React.useState("");
  const [instagram, setInstagram] = React.useState("");
  const [tiktok, setTiktok] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/creators/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName,
          bio: bio || undefined,
          instagram: instagram || undefined,
          tiktok: tiktok || undefined,
        }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? t("submitError"));
        return;
      }
      toast({ title: t("successToastTitle"), description: t("successToastDescription"), variant: "success" });
      router.push("/profile");
    } catch {
      setError(t("genericError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <Field label={t("displayNameField")} required>
        {(fieldProps) => (
          <Input {...fieldProps} value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
        )}
      </Field>

      <Field label={t("bioField")}>
        {(fieldProps) => <Textarea {...fieldProps} value={bio} onChange={(e) => setBio(e.target.value)} rows={3} />}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("instagramField")}>
          {(fieldProps) => (
            <Input {...fieldProps} value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder={t("handlePlaceholder")} />
          )}
        </Field>
        <Field label={t("tiktokField")}>
          {(fieldProps) => (
            <Input {...fieldProps} value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder={t("handlePlaceholder")} />
          )}
        </Field>
      </div>

      {error && (
        <p className="text-body-sm text-danger-500" role="alert">
          {error}
        </p>
      )}

      <Button type="submit" loading={loading}>
        {t("submitButton")}
      </Button>
    </form>
  );
}
