"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { BottomSheet, BottomSheetContent } from "@/components/ui/BottomSheet";
import { Field } from "@/components/ui/Field";
import { Input, Textarea } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export interface InquireSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  activitySlug: string;
}

export function InquireSheet({ open, onOpenChange, activitySlug }: InquireSheetProps) {
  const t = useTranslations("activity");
  const { data: session } = useSession();
  const { toast } = useToast();
  const [contactName, setContactName] = React.useState("");
  const [contactEmail, setContactEmail] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // Pre-filled from the session as a convenience, still editable — same
  // "signed in but still confirm your contact details" pattern the video
  // submission form uses.
  React.useEffect(() => {
    if (open && session?.user) {
      setContactName((prev) => prev || session.user.name || "");
      setContactEmail((prev) => prev || session.user.email || "");
    }
  }, [open, session]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await fetch(`/api/activities/${activitySlug}/inquire`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contactName, contactEmail, message: message || undefined }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? t("inquireSheet.title"));
        return;
      }

      toast({ title: t("inquireSheet.successToast"), variant: "success" });
      setMessage("");
      onOpenChange(false);
    } catch {
      setError(t("inquireSheet.title"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <BottomSheet open={open} onOpenChange={onOpenChange}>
      <BottomSheetContent title={t("inquireSheet.title")} description={t("inquireSheet.description")}>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Field label={t("inquireSheet.nameLabel")} required>
            {(fieldProps) => (
              <Input {...fieldProps} value={contactName} onChange={(e) => setContactName(e.target.value)} required />
            )}
          </Field>
          <Field label={t("inquireSheet.emailLabel")} required errorText={error ?? undefined}>
            {(fieldProps) => (
              <Input
                {...fieldProps}
                type="email"
                value={contactEmail}
                onChange={(e) => setContactEmail(e.target.value)}
                required
              />
            )}
          </Field>
          <Field label={t("inquireSheet.messageLabel")}>
            {(fieldProps) => (
              <Textarea
                {...fieldProps}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t("inquireSheet.messagePlaceholder")}
              />
            )}
          </Field>
          <Button type="submit" loading={loading} className="mt-1">
            {t("inquireSheet.submit")}
          </Button>
        </form>
      </BottomSheetContent>
    </BottomSheet>
  );
}
