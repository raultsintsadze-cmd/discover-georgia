"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/Button";

export default function ErrorBoundary({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations("errors");

  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-danger-tint text-danger-500">
        <AlertTriangle className="h-7 w-7" aria-hidden="true" />
      </div>
      <div>
        <h1 className="text-h2 text-ink-900">{t("somethingWrong")}</h1>
        <p className="mt-1 text-body-sm text-ink-500">{t("tryAgainDescription")}</p>
      </div>
      <Button onClick={reset}>{t("tryAgain")}</Button>
    </div>
  );
}
