import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { prisma } from "@/lib/db/client";
import { placeService } from "@/lib/services/impl/PlaceService";
import { BackHeader } from "@/components/shell/BackHeader";
import { PlaceCardList } from "@/components/place/PlaceCardList";
import { isSupportedLocale, DEFAULT_LOCALE } from "@/i18n/locales";
import { localize } from "@/lib/utils/localize";

interface CategoryPageProps {
  params: Promise<{ slug: string }>;
}

async function getCategory(slug: string) {
  return prisma.category.findUnique({ where: { slug }, select: { name: true, nameKa: true, nameRu: true } });
}

export async function generateMetadata({ params }: CategoryPageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) return {};

  const [locale, t] = await Promise.all([getLocale(), getTranslations("meta")]);
  const title = `${category.name} — ${t("categoryTitleSuffix")}`;
  const description = t("categoryFallbackDescription", { category: category.name.toLowerCase() });
  return {
    title,
    description,
    alternates: { canonical: `/categories/${slug}` },
    openGraph: { title, description, url: `/categories/${slug}`, type: "website", locale },
  };
}

export default async function CategoryPage({ params }: CategoryPageProps) {
  const { slug } = await params;
  const category = await getCategory(slug);
  if (!category) notFound();

  const rawLocale = await getLocale();
  const locale = isSupportedLocale(rawLocale) ? rawLocale : DEFAULT_LOCALE;
  const name = localize(category.name, category.nameKa, category.nameRu, locale);

  const places = await placeService.listByCategory(slug, locale);

  return (
    <div className="pb-12">
      <BackHeader title={name} backHref="/discover" />
      <PlaceCardList places={places} />
    </div>
  );
}
