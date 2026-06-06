"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Send, Loader2 } from "lucide-react";
import { createCommentAction } from "@/server/actions/comments";

type Props = { itemId: string };

export function CommentForm({ itemId }: Props) {
  const t = useTranslations("comments");
  const [body, setBody] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    const fd = new FormData();
    fd.append("body", body);
    startTransition(async () => {
      await createCommentAction(itemId, fd);
      setBody("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <textarea
        value={body}
        onChange={(e) => setBody(e.target.value)}
        placeholder={t("placeholder")}
        rows={2}
        className="flex-1 resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
      />
      <button
        type="submit"
        disabled={isPending || !body.trim()}
        className="self-end rounded-lg bg-primary p-2 text-primary-foreground disabled:opacity-50"
      >
        {isPending ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Send className="h-4 w-4" />
        )}
      </button>
    </form>
  );
}
