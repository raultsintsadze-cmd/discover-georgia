"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { AuthSheet } from "./AuthSheet";

export function SignInPrompt({ message }: { message: string }) {
  const t = useTranslations("common");
  const [open, setOpen] = React.useState(false);
  return (
    <div className="flex flex-col items-center gap-3 py-10 text-center">
      <p className="text-body text-ink-700">{message}</p>
      <Button onClick={() => setOpen(true)}>{t("signIn")}</Button>
      <AuthSheet open={open} onOpenChange={setOpen} />
    </div>
  );
}
