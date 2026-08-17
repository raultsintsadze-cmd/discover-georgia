"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { BackHeader } from "@/components/shell/BackHeader";
import { CreatorApplicationForm } from "@/components/video/CreatorApplicationForm";
import { Spinner } from "@/components/ui/Spinner";
import { SignInPrompt } from "@/components/auth/SignInPrompt";

export default function CreatorApplyPage() {
  const { status } = useSession();
  const t = useTranslations("creators");

  return (
    <div className="mx-auto max-w-md pb-12">
      <BackHeader title={t("applyPageTitle")} backHref="/profile" />

      <div className="px-5 pt-3">
        {status === "loading" ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : status === "authenticated" ? (
          <CreatorApplicationForm />
        ) : (
          <SignInPrompt message={t("applySignInPrompt")} />
        )}
      </div>
    </div>
  );
}
