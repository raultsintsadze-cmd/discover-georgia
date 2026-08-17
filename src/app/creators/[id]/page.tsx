import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { Instagram, Music2 } from "lucide-react";
import { creatorService } from "@/lib/services/impl/CreatorService";
import { BackHeader } from "@/components/shell/BackHeader";
import { Badge } from "@/components/ui/Badge";

interface CreatorPageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: CreatorPageProps): Promise<Metadata> {
  const { id } = await params;
  const creator = await creatorService.getProfile(id);
  if (!creator) return {};
  return { title: creator.displayName, description: creator.bio ?? undefined };
}

export default async function CreatorPage({ params }: CreatorPageProps) {
  const { id } = await params;
  const creator = await creatorService.getProfile(id);
  if (!creator) notFound();
  const t = await getTranslations("creators");

  return (
    <div className="mx-auto max-w-md pb-12">
      <BackHeader title={t("profilePageTitle")} backHref="/discover" />

      <div className="flex flex-col items-center gap-3 px-5 pt-2 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-accent-tint text-h1 text-accent-600">
          {creator.displayName.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-h2 text-ink-900">{creator.displayName}</p>
          {creator.bio && <p className="mt-1 text-body-sm text-ink-500">{creator.bio}</p>}
        </div>

        <div className="flex gap-2">
          {creator.instagram && (
            <Badge variant="neutral" className="gap-1">
              <Instagram className="h-3 w-3" aria-hidden="true" />
              {creator.instagram}
            </Badge>
          )}
          {creator.tiktok && (
            <Badge variant="neutral" className="gap-1">
              <Music2 className="h-3 w-3" aria-hidden="true" />
              {creator.tiktok}
            </Badge>
          )}
        </div>

        <div className="mt-4 flex gap-6">
          <div>
            <p className="text-h3 text-ink-900">{creator.approvedVideoCount}</p>
            <p className="text-caption text-ink-500">{t("videosLabel")}</p>
          </div>
          <div>
            <p className="text-h3 text-ink-900">{creator.approvedPlaceCount}</p>
            <p className="text-caption text-ink-500">{t("placesLabel")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
