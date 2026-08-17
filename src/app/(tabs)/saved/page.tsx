import { getTranslations } from "next-intl/server";
import { auth } from "@/lib/auth/config";
import { prisma } from "@/lib/db/client";
import { ScreenHeader } from "@/components/shell/ScreenHeader";
import { SavedPlacesList } from "@/components/place/SavedPlacesList";
import { SignInPrompt } from "@/components/auth/SignInPrompt";

export default async function SavedPage() {
  const session = await auth();
  const t = await getTranslations("saved");

  return (
    <div className="mx-auto flex min-h-[calc(100dvh-4.5rem)] max-w-md flex-col">
      <ScreenHeader title={t("title")} subtitle={t("subtitle")} />

      {!session?.user ? (
        <SignInPrompt message={t("signInPrompt")} />
      ) : (
        <SavedPageContent userId={session.user.id} />
      )}
    </div>
  );
}

async function SavedPageContent({ userId }: { userId: string }) {
  const saved = await prisma.savedPlace.findMany({
    where: { userId },
    include: { place: { include: { region: true, category: true } } },
    orderBy: { createdAt: "desc" },
  });

  const items = saved.map((s) => ({
    placeId: s.place.id,
    slug: s.place.slug,
    name: s.place.name,
    shortDescription: s.place.shortDescription,
    regionName: s.place.region.name,
    categoryName: s.place.category.name,
  }));

  return <SavedPlacesList initialItems={items} />;
}
