import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { notFound, redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { canViewTopic, canEditTopic, canManageTopicMembers } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";
import { TopicDetailView } from "@/components/topics/TopicDetailView";
import { TopicMembersPanel } from "@/components/topics/TopicMembersPanel";
import type { ItemCardData } from "@/components/items/ItemCard";
import Link from "next/link";
import { ChevronLeft, Archive } from "lucide-react";

type Props = { params: Promise<{ topicId: string }> };

export default async function TopicDetailPage({ params }: Props) {
  const { topicId } = await params;
  const session = await auth();
  const t = await getTranslations("topics");

  const userId = session!.user.id;
  const userRole = session!.user.role as Role;

  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: {
      members: {
        include: { user: { select: { id: true, displayName: true } } },
      },
    },
  });

  if (!topic) notFound();

  const memberIds = topic.members.map((m) => m.userId);
  if (!canViewTopic({ id: userId, role: userRole }, { ownerId: topic.ownerId, memberIds })) {
    redirect("/topics");
  }

  const owner = await prisma.user.findUnique({
    where: { id: topic.ownerId },
    select: { id: true, displayName: true },
  });

  const rawItems = await prisma.item.findMany({
    where: { topicId },
    orderBy: { createdAt: "asc" },
    include: {
      creator: { select: { id: true, displayName: true } },
      scores: {
        select: { userId: true, stars: true, crown: true, poop: true },
      },
      comments: {
        orderBy: { createdAt: "asc" },
        include: {
          author: { select: { id: true, displayName: true } },
        },
      },
    },
  });

  const items: ItemCardData[] = rawItems.map((item) => ({
    id: item.id,
    topicId: item.topicId,
    title: item.title,
    description: item.description,
    imagePath: item.imagePath,
    createdAt: item.createdAt,
    creator: item.creator,
    scores: item.scores,
    comments: item.comments.map((c) => ({
      id: c.id,
      body: c.body,
      createdAt: c.createdAt,
      updatedAt: c.updatedAt,
      author: c.author,
    })),
  }));

  const canManageMembers = canManageTopicMembers({ id: userId, role: userRole }, topic);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/topics"
            className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ChevronLeft className="h-4 w-4" />
            {t("title")}
          </Link>
          <h1
            className="flex items-center gap-2 text-2xl font-bold"
            style={{ color: topic.titleColor }}
          >
            <span>{topic.emoji}</span>
            <span>{topic.title}</span>
          </h1>
        </div>

        {topic.archived && (
          <span className="flex items-center gap-1 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
            <Archive className="h-3.5 w-3.5" />
            {t("archivedBadge")}
          </span>
        )}
      </div>

      {/* Member management */}
      {owner && (
        <TopicMembersPanel
          topicId={topicId}
          owner={owner}
          members={topic.members.map((m) => m.user)}
          canManage={canManageMembers}
        />
      )}

      {/* Items grid */}
      <TopicDetailView
        topicId={topicId}
        items={items}
        currentUserId={userId}
        currentUserRole={userRole}
        isArchived={topic.archived}
      />
    </div>
  );
}
