"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { commentSchema } from "@/lib/schemas";
import { canEditComment, canViewTopic } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./auth";
import type { Role } from "@/generated/prisma/enums";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function createCommentAction(
  itemId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth();
  const item = await prisma.item.findUnique({
    where: { id: itemId },
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

  const parsed = commentSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  await prisma.comment.create({
    data: { itemId, authorId: user.id, body: parsed.data.body },
  });

  revalidatePath(`/topics/${item.topicId}`);
  return { success: true, data: undefined };
}

export async function updateCommentAction(
  commentId: string,
  body: string
): Promise<ActionResult> {
  const user = await requireAuth();
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    include: { item: true },
  });
  if (!comment) return { success: false, error: "Not found" };
  if (!canEditComment({ id: user.id, role: user.role as Role }, comment)) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = commentSchema.safeParse({ body });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  await prisma.comment.update({
    where: { id: commentId },
    data: { body: parsed.data.body },
  });

  revalidatePath(`/topics/${comment.item.topicId}`);
  return { success: true, data: undefined };
}
