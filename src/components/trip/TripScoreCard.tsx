"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardContent } from "@/components/ui/Card";
import { Spinner } from "@/components/ui/Spinner";
import type { TripScore } from "@/lib/services/ai.service";

const SUB_SCORE_KEYS: { key: "routeEfficiency" | "drivingComfort" | "budgetFit" | "preferenceMatch"; labelKey: string }[] = [
  { key: "routeEfficiency", labelKey: "scoreCard.routeEfficiency" },
  { key: "drivingComfort", labelKey: "scoreCard.drivingComfort" },
  { key: "budgetFit", labelKey: "scoreCard.budgetFit" },
  { key: "preferenceMatch", labelKey: "scoreCard.preferenceMatch" },
];

function ScoreBar({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex items-center justify-between text-body-sm">
        <span className="text-ink-500">{label}</span>
        <span className="font-medium text-ink-900">{value.toFixed(1)}</span>
      </div>
      <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-accent-500" style={{ width: `${(value / 10) * 100}%` }} />
      </div>
    </div>
  );
}

/**
 * Fetches on demand rather than on tab mount — a score calculation forces a
 * real route calculation and an OpenAI call, and neither should fire just
 * because the user glanced at the Budget tab.
 */
export function TripScoreCard({ tripId }: { tripId: string }) {
  const t = useTranslations("trip");
  const [score, setScore] = React.useState<TripScore | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function loadScore() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/trips/${tripId}/score`);
      const body = await res.json();
      if (!res.ok) {
        setError(body?.error?.message ?? t("scoreCard.error"));
        return;
      }
      setScore(body.data);
    } catch {
      setError(t("scoreCard.error"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardContent className="pt-4">
        <div className="mb-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-accent-500" aria-hidden="true" />
            <p className="text-h3 text-ink-900">{t("scoreCard.title")}</p>
          </div>
          {score && <p className="text-h3 font-semibold text-accent-500">{score.overall.toFixed(1)} / 10</p>}
        </div>
        <p className="mb-3 text-caption text-ink-500">
          {t("scoreCard.disclaimer")}
        </p>

        {!score && !loading && (
          <Button variant="secondary" size="sm" onClick={loadScore}>
            {t("scoreCard.calculateButton")}
          </Button>
        )}

        {loading && (
          <div className="flex justify-center py-4">
            <Spinner label={t("scoreCard.loadingLabel")} />
          </div>
        )}

        {error && <p className="text-body-sm text-danger-500">{error}</p>}

        {score && (
          <div className="flex flex-col gap-3">
            {SUB_SCORE_KEYS.map(({ key, labelKey }) => (
              <ScoreBar key={key} label={t(labelKey)} value={score[key]} />
            ))}
            {score.notes.length > 0 && (
              <ul className="mt-1 flex flex-col gap-1 border-t border-border pt-2">
                {score.notes.map((note) => (
                  <li key={note} className="text-caption text-ink-500">
                    {note}
                  </li>
                ))}
              </ul>
            )}
            <Button variant="ghost" size="sm" onClick={loadScore} className="self-start">
              {t("scoreCard.recalculateButton")}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
