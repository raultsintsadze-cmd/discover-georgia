import { getTranslations } from "next-intl/server";
import { Clock, Sun, Gauge, Ticket, ParkingCircle, Users } from "lucide-react";
import { formatDuration } from "@/lib/utils/format";

export interface PlaceQuickInfoProps {
  recommendedDuration: number | null;
  bestSeason: string | null;
  difficulty: string | null;
  entranceFee: string | null;
  parking: boolean;
  familyFriendly: boolean;
}

function InfoTile({ icon: Icon, label, value }: { icon: typeof Clock; label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 rounded-md border border-border p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-accent-500" aria-hidden="true" />
      <div className="min-w-0">
        <p className="text-caption text-ink-500">{label}</p>
        <p className="truncate text-body-sm font-medium text-ink-900">{value}</p>
      </div>
    </div>
  );
}

export async function PlaceQuickInfo({
  recommendedDuration,
  bestSeason,
  difficulty,
  entranceFee,
  parking,
  familyFriendly,
}: PlaceQuickInfoProps) {
  const t = await getTranslations("place");
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <InfoTile
        icon={Clock}
        label={t("quickInfo.recommendedTime")}
        value={recommendedDuration ? formatDuration(recommendedDuration) : t("quickInfo.notSpecified")}
      />
      <InfoTile icon={Sun} label={t("quickInfo.bestSeason")} value={bestSeason ?? t("quickInfo.yearRound")} />
      <InfoTile
        icon={Gauge}
        label={t("quickInfo.difficulty")}
        value={difficulty ? difficulty.charAt(0) + difficulty.slice(1).toLowerCase() : t("quickInfo.easy")}
      />
      <InfoTile icon={Ticket} label={t("quickInfo.entranceFee")} value={entranceFee ?? t("quickInfo.free")} />
      <InfoTile
        icon={ParkingCircle}
        label={t("quickInfo.parking")}
        value={parking ? t("quickInfo.available") : t("quickInfo.notAvailable")}
      />
      <InfoTile
        icon={Users}
        label={t("quickInfo.familyFriendly")}
        value={familyFriendly ? t("quickInfo.yes") : t("quickInfo.notIdealForKids")}
      />
    </div>
  );
}
