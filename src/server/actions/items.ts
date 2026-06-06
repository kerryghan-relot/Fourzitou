"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { itemSchema } from "@/lib/schemas";
import { canEditItem, canViewTopic } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import type { ActionResult } from "./auth";
import type { Role } from "@/generated/prisma/enums";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

async function saveUpload(file: File): Promise<string> {
  if (file.size > MAX_FILE_SIZE) throw new Error("Image too large (max 5 MB)");
  if (!ALLOWED_MIME.includes(file.type)) throw new Error("Unsupported image type");
  const ext = extname(file.name) || ".jpg";
  const filename = `${randomUUID()}${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));
  return filename;
}

async function getTopicMemberIds(topicId: string) {
  const topic = await prisma.topic.findUnique({
    where: { id: topicId },
    include: { members: { select: { userId: true } } },
  });
  if (!topic) return null;
  return { ownerId: topic.ownerId, memberIds: topic.members.map((m) => m.userId) };
}

export async function createItemAction(
  topicId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth();
  const topic = await getTopicMemberIds(topicId);
  if (!topic) return { success: false, error: "Topic not found" };
  if (!canViewTopic({ id: user.id, role: user.role as Role }, topic)) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = itemSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  let imagePath: string | undefined;
  const file = formData.get("image") as File | null;
  if (file && file.size > 0) {
    try {
      imagePath = await saveUpload(file);
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  await prisma.item.create({
    data: { topicId, creatorId: user.id, ...parsed.data, imagePath },
  });

  revalidatePath(`/topics/${topicId}`);
  return { success: true, data: undefined };
}

export async function updateItemAction(
  itemId: string,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth();
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return { success: false, error: "Not found" };
  if (!canEditItem({ id: user.id, role: user.role as Role }, item)) {
    return { success: false, error: "Forbidden" };
  }

  const parsed = itemSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  let imagePath = item.imagePath;
  const file = formData.get("image") as File | null;
  if (file && file.size > 0) {
    try {
      if (imagePath) await unlink(join(UPLOAD_DIR, imagePath)).catch(() => {});
      imagePath = await saveUpload(file);
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }
  if (formData.get("removeImage") === "true" && imagePath) {
    await unlink(join(UPLOAD_DIR, imagePath)).catch(() => {});
    imagePath = null;
  }

  await prisma.item.update({
    where: { id: itemId },
    data: { ...parsed.data, imagePath },
  });
  revalidatePath(`/topics/${item.topicId}`);
  return { success: true, data: undefined };
}

export async function deleteItemAction(itemId: string): Promise<ActionResult> {
  const user = await requireAuth();
  const item = await prisma.item.findUnique({ where: { id: itemId } });
  if (!item) return { success: false, error: "Not found" };
  if (!canEditItem({ id: user.id, role: user.role as Role }, item)) {
    return { success: false, error: "Forbidden" };
  }

  if (item.imagePath) await unlink(join(UPLOAD_DIR, item.imagePath)).catch(() => {});
  await prisma.item.delete({ where: { id: itemId } });
  revalidatePath(`/topics/${item.topicId}`);
  return { success: true, data: undefined };
}
