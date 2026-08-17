import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/client";
import { placeService } from "@/lib/services/impl/PlaceService";
import { BackHeader } from "@/components/shell/BackHeader";
import { PlaceCardList } from "@/components/place/PlaceCardList";
import { isSupportedLocale, DEFAULT_LOCALE } from "@/i18n/locales";
import { localize } from "@/lib/utils/localize";

interface RegionPageProps {
  params: Promise<{ slug: string }>;
}

async function getRegion(slug: string) {
  return prisma.region.findUnique({
    where: { slug },
    select: { name: true, description: true, nameKa: true, nameRu: true, descriptionKa: true, descriptionRu: true },
  });
}

export async function generateMetadata({ params }: RegionPageProps): Promise<Metadata> {
  const { slug } = await params;
  const region = await getRegion(slug);
  if (!region) return {};

  const [locale, t] = await Promise.all([getLocale(), getTranslations("meta")]);
  const title = `${region.name} — ${t("regionTitleSuffix")}`;
  const description = region.description ?? t("regionFallbackDescription", { region: region.name });
  return {
    title,
    description,
    alternates: { canonical: `/regions/${slug}` },
    openGraph: { title, description, url: `/regions/${slug}`, type: "website", locale },
  };
}

export default async function RegionPage({ params }: RegionPageProps) {
  const { slug } = await params;
  const region = await getRegion(slug);
  if (!region) notFound();

  const rawLocale = await getLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const name = localize(region.name, region.nameKa, region.nameRu, locale);
  const description = localize(region.description ?? "", region.descriptionKa, region.descriptionRu, locale) || null;

  const places = await placeService.listByRegion(slug, locale);

  return (
    <div className="pb-12">
      <BackHeader title={name} backHref="/discover" />
      {description && <p className="px-5 pb-4 text-body-sm text-ink-500">{description}</p>}
      <PlaceCardList places={places} />
    </div>
  );
}
