import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { activityService } from "@/lib/services/impl/ActivityService";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { ActivityHero } from "@/components/place/ActivityHero";
import { ActivityActionRow } from "@/components/place/ActivityActionRow";

interface ActivityPageProps {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: ActivityPageProps): Promise<Metadata> {
  const { slug } = await params;
  const activity = await activityService.getBySlug(slug);
  if (!activity) return {};
  const locale = await getLocale();
  return {
    title: activity.name,
    description: activity.description ?? activity.name,
    alternates: { canonical: `/activities/${slug}` },
    openGraph: {
      title: activity.name,
      description: activity.description ?? activity.name,
      url: `/activities/${slug}`,
      type: "article",
      locale,
    },
  };
}

export default async function ActivityPage({ params }: ActivityPageProps) {
  const { slug } = await params;
  const activity = await activityService.getBySlug(slug);
  if (!activity) notFound();
  const t = await getTranslations("activity");

  const session = await auth();
  const initialSaved = session?.user
    ? (await prisma.savedActivity.findUnique({
        where: { userId_activityId: { userId: session.user.id, activityId: activity.id } },
        select: { id: true },
      })) !== null
    : false;

  const categoryLabel = t(`categories.${activity.category}` as `categories.${string}`);

  return (
    <div className="pb-12">
      <ActivityHero
        name={activity.name}
        category={activity.category}
        categoryLabel={categoryLabel}
        nearPlaceName={activity.nearPlaceName}
        nearPlaceSlug={activity.nearPlaceSlug}
      />
      <ActivityActionRow
        activityId={activity.id}
        activitySlug={activity.slug}
        initialSaved={initialSaved}
        bookingUrl={activity.bookingUrl}
      />

      <div className="flex flex-col gap-6 px-5 pt-5">
        {activity.description && <p className="text-body text-ink-900">{activity.description}</p>}

        <div className="flex gap-6">
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-ink-500">{t("priceLabel")}</p>
            <p className="text-body font-medium text-ink-900">
              {activity.price != null ? t("price", { price: activity.price.toLocaleString() }) : t("priceUnavailable")}
            </p>
          </div>
          <div>
            <p className="text-caption font-medium uppercase tracking-wide text-ink-500">{t("ratingLabel")}</p>
            <p className="text-body font-medium text-ink-900">
              {activity.rating != null ? `★ ${activity.rating.toFixed(1)}` : t("notRated")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
