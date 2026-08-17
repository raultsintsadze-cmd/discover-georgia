import { redirect } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { requireAdminSession } from "@/lib/auth/guards";
import { AdminNav } from "@/components/admin/AdminNav";
import { enMessages } from "@/i18n/enMessages";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await requireAdminSession();
  if (!session) {
    redirect("/");
  }

  return (
    // Admin is an internal tool and always renders in English, independent
    // of the site visitor's chosen language — but a couple of shared
    // traveler-facing components (e.g. PlacePicker) are rendered inside
    // admin panels and call useTranslations(), so they still need a
    // provider to read from. Fixed to English on purpose, not request-locale.
    <NextIntlClientProvider locale="en" messages={enMessages}>
      <div className="min-h-dvh">
        <header className="px-4 pb-2 pt-safe">
          <h1 className="pt-4 text-h1 text-ink-900">Admin</h1>
        </header>
        <AdminNav />
        <main className="mx-auto max-w-5xl px-4 py-5">{children}</main>
      </div>
    </NextIntlClientProvider>
  );
}
