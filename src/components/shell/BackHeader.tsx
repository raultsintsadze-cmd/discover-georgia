import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useTranslations } from "next-intl";

// Plain sync function (not async, not "use client") — next-intl's
// useTranslations works in both Server and Client Components, unlike
// next-intl/server's getTranslations, which only works in Server
// Components and breaks when a Client Component (e.g. submit/page.tsx,
// creators/apply/page.tsx) renders this.
export function BackHeader({ title, backHref }: { title: string; backHref: string }) {
  const t = useTranslations("common");
  return (
    <header className="px-5 pb-3 pt-safe">
      <div className="flex items-center gap-3 pt-5">
        <Link
          href={backHref}
          aria-label={t("back")}
          className="-ml-2 flex h-touch w-touch shrink-0 items-center justify-center rounded-full hover:bg-surface-2"
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Link>
        <h1 className="text-h1 text-ink-900">{title}</h1>
      </div>
    </header>
  );
}
