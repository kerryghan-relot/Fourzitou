"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Pencil, Check, X } from "lucide-react";
import { MarkdownRenderer } from "@/lib/markdown";
import { updateCommentAction } from "@/server/actions/comments";
import { formatRelative } from "@/lib/utils";

export type CommentData = {
  id: string;
  body: string;
  createdAt: Date | string;
  updatedAt: Date | string;
  author: { id: string; displayName: string };
};

type Props = {
  comments: CommentData[];
  currentUserId: string;
};

function CommentItem({
  comment,
  isOwn,
}: {
  comment: CommentData;
  isOwn: boolean;
}) {
  const t = useTranslations("comments");
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [saving, setSaving] = useState(false);

  async function saveEdit() {
    if (!draft.trim() || draft === comment.body) {
      setEditing(false);
      return;
    }
    setSaving(true);
    await updateCommentAction(comment.id, draft);
    setSaving(false);
    setEditing(false);
  }

  const wasEdited =
    new Date(comment.updatedAt).getTime() > new Date(comment.createdAt).getTime() + 1000;

  return (
    <div className="group flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
        {comment.author.displayName.slice(0, 2).toUpperCase()}
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-foreground">
            {comment.author.displayName}
          </span>
          <span className="text-xs text-muted-foreground">
            {formatRelative(comment.createdAt)}
          </span>
          {wasEdited && (
            <span className="text-xs text-muted-foreground italic">
              ({t("edited")})
            </span>
          )}
        </div>

        {editing ? (
          <div className="space-y-2">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              rows={3}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex gap-2">
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex items-center gap-1 rounded-lg bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground disabled:opacity-60"
              >
                <Check className="h-3 w-3" />
                Save
              </button>
              <button
                onClick={() => { setEditing(false); setDraft(comment.body); }}
                className="flex items-center gap-1 rounded-lg border border-border px-2.5 py-1 text-xs text-foreground"
              >
                <X className="h-3 w-3" />
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="relative">
            <MarkdownRenderer content={comment.body} />
            {isOwn && (
              <button
                onClick={() => setEditing(true)}
                className="absolute right-0 top-0 opacity-0 transition-opacity group-hover:opacity-100"
                title={t("edit")}
              >
                <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CommentList({ comments, currentUserId }: Props) {
  const t = useTranslations("comments");

  if (comments.length === 0) {
    return (
      <p className="text-sm text-muted-foreground italic">{t("noComments")}</p>
    );
  }

  return (
    <div className="space-y-4">
      {comments.map((c) => (
        <CommentItem
          key={c.id}
          comment={c}
          isOwn={c.author.id === currentUserId}
        />
      ))}
    </div>
  );
}
