import { getTranslations } from "next-intl/server";
import { Spinner } from "@/components/ui/Spinner";

export default async function PlaceLoading() {
  const t = await getTranslations("place");
  return (
    <div className="flex min-h-dvh items-center justify-center">
      <Spinner label={t("loading")} />
    </div>
  );
}
