"use client";

import * as React from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { User, Video, Upload, LogOut, KeyRound } from "lucide-react";
import { ScreenHeader } from "@/components/shell/ScreenHeader";
import { LanguageSwitcher } from "@/components/shell/LanguageSwitcher";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { AuthSheet } from "@/components/auth/AuthSheet";
import { ChangePasswordSheet } from "@/components/auth/ChangePasswordSheet";

export default function ProfilePage() {
  const t = useTranslations("profile");
  const { data: session, status } = useSession();
  const [authOpen, setAuthOpen] = React.useState(false);
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);

  return (
    <div className="mx-auto max-w-md">
      <ScreenHeader title={t("title")} />
      <div className="flex flex-col gap-5 px-5">
        {status === "loading" ? (
          <div className="flex justify-center py-10">
            <Spinner />
          </div>
        ) : session?.user ? (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-tint text-accent-600">
                <User className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <p className="text-h3 text-ink-900">{session.user.name ?? session.user.email}</p>
                <p className="mt-1 text-body-sm text-ink-500">{session.user.email}</p>
              </div>
              <div className="flex w-full flex-col gap-2 pt-2">
                <Link href="/submit">
                  <Button variant="secondary" className="w-full">
                    <Upload className="h-4 w-4" aria-hidden="true" />
                    {t("submitVideo")}
                  </Button>
                </Link>
                <Link href="/creators/apply">
                  <Button variant="secondary" className="w-full">
                    <Video className="h-4 w-4" aria-hidden="true" />
                    {t("becomeCreator")}
                  </Button>
                </Link>
                <Button variant="secondary" className="w-full" onClick={() => setChangePasswordOpen(true)}>
                  <KeyRound className="h-4 w-4" aria-hidden="true" />
                  {t("changePassword")}
                </Button>
                <Button variant="outline" className="w-full" onClick={() => signOut()}>
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  {t("signOut")}
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex flex-col items-center gap-3 pt-6 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-surface-2 text-ink-500">
                <User className="h-7 w-7" aria-hidden="true" />
              </div>
              <div>
                <p className="text-h3 text-ink-900">{t("guestTitle")}</p>
                <p className="mt-1 text-body-sm text-ink-500">{t("guestDescription")}</p>
              </div>
              <Button className="w-full" onClick={() => setAuthOpen(true)}>
                {t("signIn")}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardContent className="pt-5">
            <LanguageSwitcher />
          </CardContent>
        </Card>
      </div>

      <AuthSheet open={authOpen} onOpenChange={setAuthOpen} />
      <ChangePasswordSheet open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </div>
  );
}
