"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { MessageCircle, Pencil, Trash2 } from "lucide-react";
import { deleteItemAction, updateItemAction } from "@/server/actions/items";
import { ScoreControls } from "./ScoreControls";
import { ItemModal, type ItemModalData } from "./ItemModal";
import { ItemFormModal } from "./ItemFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { CommentData } from "@/components/comments/CommentList";

export type ItemCardData = ItemModalData & {
  comments: CommentData[];
};

type Props = {
  item: ItemCardData;
  currentUserId: string;
  canEdit: boolean;
  userCrownItemId: string | null;
};

export function ItemCard({ item, currentUserId, canEdit, userCrownItemId }: Props) {
  const t = useTranslations("items");
  const [showModal, setShowModal] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [, startTransition] = useTransition();

  const hasComments = item.comments.length > 0;
  const userHasCrownElsewhere =
    userCrownItemId !== null && userCrownItemId !== item.id;

  function handleDelete() {
    startTransition(async () => {
      await deleteItemAction(item.id);
      setShowDelete(false);
    });
  }

  return (
    <>
      <div className="group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md">
        {/* Image */}
        {item.imagePath && (
          <button
            onClick={() => setShowModal(true)}
            className="block w-full overflow-hidden rounded-lg"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/uploads/${item.imagePath}`}
              alt={item.title}
              className="h-36 w-full object-cover transition-transform hover:scale-105"
            />
          </button>
        )}

        {/* Title + actions */}
        <div className="flex items-start justify-between gap-2">
          <button
            onClick={() => setShowModal(true)}
            className="flex-1 text-left text-base font-semibold text-foreground hover:text-primary"
          >
            {item.title}
          </button>

          {canEdit && (
            <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                onClick={() => setShowEdit(true)}
                className="rounded p-1 text-muted-foreground hover:text-foreground"
                title={t("edit")}
              >
                <Pencil className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setShowDelete(true)}
                className="rounded p-1 text-muted-foreground hover:text-destructive"
                title={t("delete")}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Inline score controls */}
        <ScoreControls
          itemId={item.id}
          topicId={item.topicId}
          currentUserId={currentUserId}
          scores={item.scores}
          userHasCrownElsewhere={userHasCrownElsewhere}
        />

        {/* Comment badge */}
        {hasComments && (
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 self-start rounded-full bg-accent px-2.5 py-0.5 text-xs text-accent-foreground hover:opacity-80"
          >
            <MessageCircle className="h-3 w-3" />
            {item.comments.length}
          </button>
        )}
      </div>

      {/* Item detail modal */}
      {showModal && (
        <ItemModal
          item={item}
          currentUserId={currentUserId}
          userHasCrownElsewhere={userHasCrownElsewhere}
          onClose={() => setShowModal(false)}
          canEdit={canEdit}
          onEdit={() => { setShowModal(false); setShowEdit(true); }}
        />
      )}

      {/* Edit form */}
      {showEdit && (
        <ItemFormModal
          topicId={item.topicId}
          item={{ title: item.title, description: item.description, imagePath: item.imagePath }}
          onClose={() => setShowEdit(false)}
          onSubmit={async (fd) => {
            await updateItemAction(item.id, fd);
            setShowEdit(false);
          }}
        />
      )}

      {/* Delete confirm */}
      {showDelete && (
        <ConfirmDialog
          message={t("confirmDelete")}
          onConfirm={handleDelete}
          onCancel={() => setShowDelete(false)}
          destructive
        />
      )}
    </>
  );
}
