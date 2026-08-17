"use client";

import { useSession } from "next-auth/react";
import { useTranslations } from "next-intl";
import { BackHeader } from "@/components/shell/BackHeader";
import { VideoSubmissionForm } from "@/components/video/VideoSubmissionForm";
import { Spinner } from "@/components/ui/Spinner";
import { SignInPrompt } from "@/components/auth/SignInPrompt";

export default function SubmitVideoPage() {
  const { status } = useSession();
  const t = useTranslations("submit");

  return (
    <div className="mx-auto max-w-md pb-12">
      <BackHeader title={t("pageTitle")} backHref="/profile" />

      <div className="px-5 pt-3">
        {status === "loading" ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : status === "authenticated" ? (
          <VideoSubmissionForm />
        ) : (
          <SignInPrompt message={t("signInPrompt")} />
        )}
      </div>
    </div>
  );
}
