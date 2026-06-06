"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { topicSchema } from "@/lib/schemas";
import { canEditTopic, canManageTopicMembers } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import type { ActionResult } from "./auth";

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function createTopicAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = topicSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  await prisma.topic.create({
    data: { ...parsed.data, ownerId: user.id },
  });

  revalidatePath("/topics");
  return { success: true, data: undefined };
}

export async function updateTopicAction(
  topicId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth();
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) return { success: false, error: "Not found" };
  if (!canEditTopic({ id: user.id, role: user.role as import("@/generated/prisma/enums").Role }, topic)) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = topicSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  await prisma.topic.update({ where: { id: topicId }, data: parsed.data });
  revalidatePath("/topics");
  revalidatePath(`/topics/${topicId}`);
  return { success: true, data: undefined };
}

export async function archiveTopicAction(
  topicId: string,
  archived: boolean
): Promise<ActionResult> {
  const user = await requireAuth();
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) return { success: false, error: "Not found" };
  if (!canEditTopic({ id: user.id, role: user.role as import("@/generated/prisma/enums").Role }, topic)) {
    return { success: false, error: "Forbidden" };
  }

  await prisma.topic.update({ where: { id: topicId }, data: { archived } });
  revalidatePath("/topics");
  return { success: true, data: undefined };
}

export async function deleteTopicAction(topicId: string): Promise<ActionResult> {
  const user = await requireAuth();
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) return { success: false, error: "Not found" };
  if (!canEditTopic({ id: user.id, role: user.role as import("@/generated/prisma/enums").Role }, topic)) {
    return { success: false, error: "Forbidden" };
  }

  await prisma.topic.delete({ where: { id: topicId } });
  revalidatePath("/topics");
  return { success: true, data: undefined };
}

export async function addTopicMemberAction(
  topicId: string,
  displayName: string
): Promise<ActionResult> {
  const user = await requireAuth();
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) return { success: false, error: "Not found" };
  if (
    !canManageTopicMembers({ id: user.id, role: user.role as import("@/generated/prisma/enums").Role }, topic)
  ) {
    return { success: false, error: "Forbidden" };
  }

  const target = await prisma.user.findUnique({ where: { displayName } });
  if (!target) return { success: false, error: "User not found" };
  if (target.id === topic.ownerId) return { success: false, error: "Owner is already a member" };

  await prisma.topicMember.upsert({
    where: { topicId_userId: { topicId, userId: target.id } },
    update: {},
    create: { topicId, userId: target.id },
  });

  revalidatePath(`/topics/${topicId}`);
  return { success: true, data: undefined };
}

export async function removeTopicMemberAction(
  topicId: string,
  memberId: string
): Promise<ActionResult> {
  const user = await requireAuth();
  const topic = await prisma.topic.findUnique({ where: { id: topicId } });
  if (!topic) return { success: false, error: "Not found" };
  if (
    !canManageTopicMembers({ id: user.id, role: user.role as import("@/generated/prisma/enums").Role }, topic)
  ) {
    return { success: false, error: "Forbidden" };
  }

  await prisma.topicMember.deleteMany({
    where: { topicId, userId: memberId },
  });

  revalidatePath(`/topics/${topicId}`);
  return { success: true, data: undefined };
}
