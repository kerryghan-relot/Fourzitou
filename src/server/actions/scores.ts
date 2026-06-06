"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { canViewTopic } from "@/lib/permissions";
import { validateStars } from "@/lib/scoring";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./auth";
import type { Role } from "@/generated/prisma/enums";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function upsertScoreAction(input: {
  itemId: string;
  stars: number;
  crown: boolean;
  poop: boolean;
}): Promise<ActionResult> {
  const user = await requireAuth();
  if (!validateStars(input.stars)) return { success: false, error: "Invalid star count" };

  const item = await prisma.item.findUnique({
    where: { id: input.itemId },
    include: { topic: { include: { members: { select: { userId: true } } } } },
  });
  if (!item) return { success: false, error: "Not found" };

  const memberIds = item.topic.members.map((m) => m.userId);
  if (
    !canViewTopic({ id: user.id, role: user.role as Role }, {
      ownerId: item.topic.ownerId,
      memberIds,
    })
  ) {
    return { success: false, error: "Forbidden" };
  }

  // Crown uniqueness: remove crown from any other item in this topic for this user
  if (input.crown) {
    await prisma.score.updateMany({
      where: {
        userId: user.id,
        crown: true,
        item: { topicId: item.topicId },
        NOT: { itemId: input.itemId },
      },
      data: { crown: false },
    });
  }

  await prisma.score.upsert({
    where: { itemId_userId: { itemId: input.itemId, userId: user.id } },
    update: { stars: input.stars, crown: input.crown, poop: input.poop },
    create: {
      itemId: input.itemId,
      userId: user.id,
      stars: input.stars,
      crown: input.crown,
      poop: input.poop,
    },
  });

  revalidatePath(`/topics/${item.topicId}`);
  return { success: true, data: undefined };
}
