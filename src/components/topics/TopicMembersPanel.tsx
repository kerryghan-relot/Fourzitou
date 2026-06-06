"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { UserPlus, X, Loader2 } from "lucide-react";
import { addTopicMemberAction, removeTopicMemberAction } from "@/server/actions/topics";

export type MemberEntry = { id: string; displayName: string };

type Props = {
  topicId: string;
  owner: MemberEntry;
  members: MemberEntry[];
  canManage: boolean;
};

export function TopicMembersPanel({ topicId, owner, members, canManage }: Props) {
  const t = useTranslations("topics");
  const tc = useTranslations("common");

  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    startTransition(async () => {
      const result = await addTopicMemberAction(topicId, query.trim());
      if (!result.success) setError(result.error ?? tc("error"));
      else setQuery("");
    });
  }

  function handleRemove(memberId: string) {
    setError(null);
    startTransition(async () => {
      const result = await removeTopicMemberAction(topicId, memberId);
      if (!result.success) setError(result.error ?? tc("error"));
    });
  }

  const all = [owner, ...members];

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-semibold text-foreground">{t("members")}</h2>

      <div className="flex flex-wrap gap-2">
        {all.map((m) => {
          const isOwner = m.id === owner.id;
          return (
            <span
              key={m.id}
              className="flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1 text-sm text-foreground"
            >
              <span className="h-2 w-2 rounded-full bg-accent-foreground/30" />
              {m.displayName}
              {!isOwner && canManage && (
                <button
                  onClick={() => handleRemove(m.id)}
                  disabled={isPending}
                  title={t("removeMember")}
                  className="text-muted-foreground hover:text-destructive disabled:opacity-50"
                >
                  <X className="h-3 w-3" />
                </button>
              )}
            </span>
          );
        })}
      </div>

      {canManage && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("addMember")}
            className="flex-1 rounded-lg border border-input bg-background px-3 py-1.5 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={isPending || !query.trim()}
            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-sm text-foreground hover:bg-accent disabled:opacity-50"
          >
            {isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <UserPlus className="h-4 w-4" />
            )}
          </button>
        </form>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
