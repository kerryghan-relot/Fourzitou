"use client";

import { useOptimistic, useTransition } from "react";
import { Star, Crown, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { upsertScoreAction } from "@/server/actions/scores";
import { aggregateScores } from "@/lib/scoring";
import { useTranslations } from "next-intl";

export type ScoreEntry = {
  userId: string;
  stars: number;
  crown: boolean;
  poop: boolean;
};

type Props = {
  itemId: string;
  topicId: string;
  currentUserId: string;
  scores: ScoreEntry[];
  /** Other items' crown state for this user in this topic (for optimistic crown toggle) */
  userHasCrownElsewhere: boolean;
};

export function ScoreControls({
  itemId,
  currentUserId,
  scores,
  userHasCrownElsewhere,
}: Props) {
  const t = useTranslations("scoring");
  const [, startTransition] = useTransition();

  const myScore = scores.find((s) => s.userId === currentUserId) ?? {
    userId: currentUserId,
    stars: 0,
    crown: false,
    poop: false,
  };

  const [optimistic, applyOptimistic] = useOptimistic(
    myScore,
    (_prev, next: typeof myScore) => next
  );

  const aggregate = aggregateScores(scores);

  function update(patch: Partial<typeof myScore>) {
    const next = { ...optimistic, ...patch };
    applyOptimistic(next);
    startTransition(async () => {
      await upsertScoreAction({ itemId, ...next });
    });
  }

  function handleStar(n: number) {
    // Click same star to clear
    update({ stars: optimistic.stars === n ? 0 : n });
  }

  function handleCrown() {
    update({ crown: !optimistic.crown });
  }

  function handlePoop() {
    update({ poop: !optimistic.poop });
  }

  return (
    <div className="space-y-2">
      {/* My score */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => handleStar(n)}
              title={`${n} star${n > 1 ? "s" : ""}`}
              className="p-0.5 transition-transform hover:scale-110"
            >
              <Star
                className={cn(
                  "h-5 w-5 transition-colors",
                  n <= optimistic.stars
                    ? "fill-amber-400 text-amber-400"
                    : "text-muted-foreground"
                )}
              />
            </button>
          ))}
        </div>

        <button
          onClick={handleCrown}
          title={t("crown")}
          className={cn(
            "rounded-full p-1 text-lg leading-none transition-all",
            optimistic.crown
              ? "scale-110 opacity-100"
              : "opacity-40 hover:opacity-70"
          )}
        >
          👑
        </button>

        <button
          onClick={handlePoop}
          title={t("poop")}
          className={cn(
            "rounded-full p-1 text-lg leading-none transition-all",
            optimistic.poop
              ? "scale-110 opacity-100"
              : "opacity-40 hover:opacity-70"
          )}
        >
          💩
        </button>
      </div>

      {/* Aggregate */}
      {(aggregate.voterCount > 0 || aggregate.crownCount > 0 || aggregate.poopCount > 0) && (
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          {aggregate.voterCount > 0 && (
            <span className="flex items-center gap-0.5">
              <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
              {aggregate.averageStars.toFixed(1)}
              <span className="ml-0.5 opacity-60">({aggregate.voterCount})</span>
            </span>
          )}
          {aggregate.crownCount > 0 && <span>👑 {aggregate.crownCount}</span>}
          {aggregate.poopCount > 0 && <span>💩 {aggregate.poopCount}</span>}
        </div>
      )}
    </div>
  );
}
