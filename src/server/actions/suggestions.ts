"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { suggestionSchema } from "@/lib/schemas";
import { canManageUsers } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import type { ActionResult } from "./auth";
import type { Role, SuggestionReaction } from "@/generated/prisma/enums";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp", "image/gif"];

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

async function requireAdmin() {
  const user = await requireAuth();
  if (!canManageUsers({ id: user.id, role: user.role as Role })) {
    throw new Error("Forbidden");
  }
  return user;
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

export async function createSuggestionAction(formData: FormData): Promise<ActionResult> {
  const user = await requireAuth();

  const parsed = suggestionSchema.safeParse({
    type: formData.get("type"),
    title: formData.get("title"),
    description: formData.get("description"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const file = formData.get("image") as File | null;
  if (parsed.data.type === "BUG" && (!file || file.size === 0)) {
    return { success: false, error: "An image is required for bug reports" };
  }

  let imagePath: string | undefined;
  if (file && file.size > 0) {
    try {
      imagePath = await saveUpload(file);
    } catch (e) {
      return { success: false, error: (e as Error).message };
    }
  }

  await prisma.suggestion.create({
    data: { userId: user.id, ...parsed.data, imagePath },
  });

  revalidatePath("/settings/admin");
  return { success: true, data: undefined };
}

export async function adminUpdateSuggestionReactionAction(
  id: string,
  reaction: SuggestionReaction | null
): Promise<ActionResult> {
  await requireAdmin();

  const suggestion = await prisma.suggestion.findUnique({ where: { id } });
  if (!suggestion) return { success: false, error: "Not found" };

  await prisma.suggestion.update({ where: { id }, data: { reaction } });
  revalidatePath("/settings/admin");
  return { success: true, data: undefined };
}

export async function uploadSuggestionInlineImageAction(
  formData: FormData
): Promise<ActionResult<{ imagePath: string }>> {
  await requireAuth();
  const file = formData.get("image") as File | null;
  if (!file || file.size === 0) return { success: false, error: "No file provided" };
  try {
    const imagePath = await saveUpload(file);
    return { success: true, data: { imagePath } };
  } catch (e) {
    return { success: false, error: (e as Error).message };
  }
}

export async function adminToggleRemoveSuggestionAction(id: string): Promise<ActionResult> {
  await requireAdmin();

  const suggestion = await prisma.suggestion.findUnique({ where: { id } });
  if (!suggestion) return { success: false, error: "Not found" };

  await prisma.suggestion.update({ where: { id }, data: { removed: !suggestion.removed } });
  revalidatePath("/settings/admin");
  return { success: true, data: undefined };
}
