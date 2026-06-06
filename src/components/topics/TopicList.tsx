"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Plus, Archive, Pencil, Trash2, ArchiveRestore } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  createTopicAction,
  archiveTopicAction,
  deleteTopicAction,
} from "@/server/actions/topics";
import { TopicFormModal } from "./TopicFormModal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import type { Topic } from "@/generated/prisma/client";

type Props = {
  topics: Topic[];
  userId: string;
  isAdmin: boolean;
};

export function TopicList({ topics: initial, userId, isAdmin }: Props) {
  const t = useTranslations();
  const [showArchived, setShowArchived] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [editTopic, setEditTopic] = useState<Topic | null>(null);
  const [deleteTopic, setDeleteTopic] = useState<Topic | null>(null);
  const [isPending, startTransition] = useTransition();

  const visible = initial.filter((t) => t.archived === showArchived);

  function handleArchive(topic: Topic, archived: boolean) {
    startTransition(async () => {
      await archiveTopicAction(topic.id, archived);
    });
  }

  function handleDelete(topic: Topic) {
    startTransition(async () => {
      await deleteTopicAction(topic.id);
      setDeleteTopic(null);
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-foreground">{t("topics.title")}</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowArchived((v) => !v)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors",
              showArchived
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:text-foreground"
            )}
          >
            <Archive className="h-3.5 w-3.5" />
            {t("topics.archivedBadge")}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            {t("topics.create")}
          </button>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-muted-foreground">{t("topics.noTopics")}</p>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((topic) => {
            const canEdit = isAdmin || topic.ownerId === userId;
            return (
              <div
                key={topic.id}
                className="group relative flex flex-col gap-2 rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md"
              >
                <Link href={`/topics/${topic.id}`} className="flex items-center gap-3">
                  <span className="text-3xl">{topic.emoji}</span>
                  <span
                    className="truncate text-lg font-semibold"
                    style={{ color: topic.titleColor }}
                  >
                    {topic.title}
                  </span>
                </Link>

                {canEdit && (
                  <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      onClick={() => setEditTopic(topic)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                      title={t("topics.edit")}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={() => handleArchive(topic, !topic.archived)}
                      className="rounded p-1 text-muted-foreground hover:text-foreground"
                      title={topic.archived ? t("topics.unarchive") : t("topics.archive")}
                      disabled={isPending}
                    >
                      {topic.archived ? (
                        <ArchiveRestore className="h-3.5 w-3.5" />
                      ) : (
                        <Archive className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <button
                      onClick={() => setDeleteTopic(topic)}
                      className="rounded p-1 text-muted-foreground hover:text-destructive"
                      title={t("topics.delete")}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {showCreate && (
        <TopicFormModal
          onClose={() => setShowCreate(false)}
          onSubmit={async (formData) => {
            await createTopicAction(formData);
            setShowCreate(false);
          }}
        />
      )}

      {editTopic && (
        <TopicFormModal
          topic={editTopic}
          onClose={() => setEditTopic(null)}
          onSubmit={async (formData) => {
            const { updateTopicAction } = await import("@/server/actions/topics");
            await updateTopicAction(editTopic.id, formData);
            setEditTopic(null);
          }}
        />
      )}

      {deleteTopic && (
        <ConfirmDialog
          message={t("topics.confirmDelete")}
          onConfirm={() => handleDelete(deleteTopic)}
          onCancel={() => setDeleteTopic(null)}
          destructive
        />
      )}
    </div>
  );
}
