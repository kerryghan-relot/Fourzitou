import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { TopicList } from "@/components/topics/TopicList";

export default async function TopicsPage() {
  const session = await auth();
  const t = await getTranslations("topics");
  const userId = session!.user.id;
  const isAdmin = session!.user.role === "ADMIN";

  const topics = isAdmin
    ? await prisma.topic.findMany({ orderBy: { createdAt: "desc" } })
    : await prisma.topic.findMany({
        where: {
          OR: [
            { ownerId: userId },
            { members: { some: { userId } } },
          ],
        },
        orderBy: { createdAt: "desc" },
      });

  return (
    <div className="space-y-6">
      <TopicList topics={topics} userId={userId} isAdmin={isAdmin} />
    </div>
  );
}
