"use client";

import { useTranslations } from "next-intl";
import { X, MessageCircle } from "lucide-react";
import { MarkdownRenderer } from "@/lib/markdown";
import { CommentList, type CommentData } from "@/components/comments/CommentList";
import { CommentForm } from "@/components/comments/CommentForm";
import { formatDate } from "@/lib/utils";
import { ScoreControls, type ScoreEntry } from "./ScoreControls";

export type ItemModalData = {
  id: string;
  topicId: string;
  title: string;
  description: string;
  imagePath: string | null;
  createdAt: Date | string;
  creator: { id: string; displayName: string };
  scores: ScoreEntry[];
  comments: CommentData[];
};

type Props = {
  item: ItemModalData;
  currentUserId: string;
  userHasCrownElsewhere: boolean;
  onClose: () => void;
  onEdit?: () => void;
  canEdit: boolean;
};

export function ItemModal({
  item,
  currentUserId,
  userHasCrownElsewhere,
  onClose,
  onEdit,
  canEdit,
}: Props) {
  const t = useTranslations("items");
  const tc = useTranslations("common");
  const tcomments = useTranslations("comments");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-card shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-border p-5">
          <div className="space-y-1">
            <h2 className="text-xl font-bold text-foreground">{item.title}</h2>
            <p className="text-xs text-muted-foreground">
              {t("createdBy", { name: item.creator.displayName })} ·{" "}
              {formatDate(item.createdAt)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {canEdit && (
              <button
                onClick={onEdit}
                className="rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent"
              >
                {tc("edit")}
              </button>
            )}
            <button
              onClick={onClose}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {/* Image */}
          {item.imagePath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/uploads/${item.imagePath}`}
              alt={item.title}
              className="w-full max-h-64 rounded-lg object-cover"
            />
          )}

          {/* Description */}
          <MarkdownRenderer content={item.description} />

          {/* Scoring */}
          <div className="border-t border-border pt-4">
            <ScoreControls
              itemId={item.id}
              topicId={item.topicId}
              currentUserId={currentUserId}
              scores={item.scores}
              userHasCrownElsewhere={userHasCrownElsewhere}
            />
          </div>

          {/* Comments */}
          <div className="border-t border-border pt-4 space-y-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <MessageCircle className="h-4 w-4" />
              {tcomments("title")} ({item.comments.length})
            </h3>
            <CommentList comments={item.comments} currentUserId={currentUserId} />
            <CommentForm itemId={item.id} />
          </div>
        </div>
      </div>
    </div>
  );
}
