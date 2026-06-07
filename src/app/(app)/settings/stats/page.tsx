import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";

export default async function SettingsStatsPage() {
  const session = await auth();
  const t = await getTranslations("stats");
  const userId = session!.user.id;

  const [
    topicsOwned,
    topicsShared,
    itemsCreated,
    commentsWritten,
    crownsGiven,
    poopsGiven,
    suggestionsSubmitted,
  ] = await Promise.all([
    prisma.topic.count({ where: { ownerId: userId } }),
    prisma.topicMember.count({ where: { userId } }),
    prisma.item.count({ where: { creatorId: userId } }),
    prisma.comment.count({ where: { authorId: userId } }),
    prisma.score.count({ where: { userId, crown: true } }),
    prisma.score.count({ where: { userId, poop: true } }),
    prisma.suggestion.count({ where: { userId } }),
  ]);

  const topItemsByTopic = await prisma.item.groupBy({
    by: ["topicId"],
    where: { creatorId: userId },
    _count: { id: true },
    orderBy: { _count: { id: "desc" } },
    take: 1,
  });

  let mostActiveTopic: { title: string; emoji: string } | null = null;
  if (topItemsByTopic.length > 0) {
    mostActiveTopic = await prisma.topic.findUnique({
      where: { id: topItemsByTopic[0].topicId },
      select: { title: true, emoji: true },
    });
  }

  const tSuggestions = await getTranslations("suggestions");

  const stats = [
    { label: t("topicsOwned"), value: topicsOwned },
    { label: t("topicsShared"), value: topicsShared },
    { label: t("itemsCreated"), value: itemsCreated },
    { label: t("commentsWritten"), value: commentsWritten },
    { label: t("crownsGiven"), value: crownsGiven },
    { label: t("poopsGiven"), value: poopsGiven },
    { label: tSuggestions("statsLabel"), value: suggestionsSubmitted },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col gap-1 rounded-xl border border-border bg-card p-4"
          >
            <span className="text-3xl font-bold text-foreground">{stat.value}</span>
            <span className="text-xs text-muted-foreground">{stat.label}</span>
          </div>
        ))}
      </div>

      {mostActiveTopic && (
        <div className="rounded-xl border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground">{t("mostActiveIn")}</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {mostActiveTopic.emoji} {mostActiveTopic.title}
          </p>
        </div>
      )}
    </div>
  );
}
