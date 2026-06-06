"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { ItemCard, type ItemCardData } from "@/components/items/ItemCard";
import { ItemFormModal } from "@/components/items/ItemFormModal";
import { createItemAction } from "@/server/actions/items";
import { getCrownItemIdForUser, aggregateScores } from "@/lib/scoring";

type Props = {
  topicId: string;
  items: ItemCardData[];
  currentUserId: string;
  currentUserRole: string;
  isArchived: boolean;
};

export function TopicDetailView({
  topicId,
  items,
  currentUserId,
  currentUserRole,
  isArchived,
}: Props) {
  const t = useTranslations("items");
  const [showNewItem, setShowNewItem] = useState(false);

  // Build flat scores list for crown lookup
  const allScores = items.flatMap((item) =>
    item.scores.map((s) => ({ itemId: item.id, userId: s.userId, crown: s.crown }))
  );
  const userCrownItemId = getCrownItemIdForUser(allScores, currentUserId);

  // Sort: crown-only first, poop-only last, then by average stars desc
  const sortedItems = [...items].sort((a, b) => {
    const aggA = aggregateScores(a.scores);
    const aggB = aggregateScores(b.scores);
    const rankOf = (agg: typeof aggA) => {
      if (agg.crownCount > 0 && agg.poopCount === 0) return 2;
      if (agg.poopCount > 0 && agg.crownCount === 0) return 0;
      return 1;
    };
    const rankDiff = rankOf(aggB) - rankOf(aggA);
    return rankDiff !== 0 ? rankDiff : aggB.averageStars - aggA.averageStars;
  });

  const canAdd = !isArchived;

  async function handleCreate(fd: FormData) {
    await createItemAction(topicId, fd);
    setShowNewItem(false);
  }

  return (
    <>
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {items.length === 0 ? t("noItems") : null}
        </p>
        {canAdd && (
          <button
            onClick={() => setShowNewItem(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t("create")}
          </button>
        )}
      </div>

      {items.length === 0 && !canAdd ? (
        <p className="text-sm text-muted-foreground italic">{t("noItems")}</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sortedItems.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              currentUserId={currentUserId}
              canEdit={
                currentUserRole === "ADMIN" || item.creator.id === currentUserId
              }
              userCrownItemId={userCrownItemId}
            />
          ))}
        </div>
      )}

      {showNewItem && (
        <ItemFormModal
          topicId={topicId}
          onClose={() => setShowNewItem(false)}
          onSubmit={handleCreate}
        />
      )}
    </>
  );
}
