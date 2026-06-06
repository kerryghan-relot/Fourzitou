"use server";

import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import {
  changePasswordSchema,
  updateProfileSchema,
  signUpSchema,
} from "@/lib/schemas";
import { canManageUsers } from "@/lib/permissions";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { writeFile, mkdir, unlink } from "fs/promises";
import { join, extname } from "path";
import { randomUUID } from "crypto";
import type { ActionResult } from "./auth";
import type { Role } from "@/generated/prisma/enums";

const UPLOAD_DIR =
  process.env.UPLOAD_DIR ?? join(process.cwd(), "public", "uploads");

async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user;
}

export async function updateProfileAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = updateProfileSchema.safeParse({
    displayName: formData.get("displayName"),
    locale: formData.get("locale"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const conflict = await prisma.user.findFirst({
    where: { displayName: parsed.data.displayName, NOT: { id: user.id } },
  });
  if (conflict) return { success: false, error: "Display name already taken" };

  await prisma.user.update({
    where: { id: user.id },
    data: { displayName: parsed.data.displayName, locale: parsed.data.locale },
  });
  revalidatePath("/profile");
  return { success: true, data: undefined };
}

export async function updateAvatarAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth();
  const file = formData.get("avatar") as File | null;
  if (!file || file.size === 0) return { success: false, error: "No file provided" };
  if (file.size > 3 * 1024 * 1024) return { success: false, error: "Max 3 MB" };
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
    return { success: false, error: "Unsupported type (jpg/png/webp only)" };
  }

  const filename = `avatar_${randomUUID()}${extname(file.name) || ".jpg"}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(join(UPLOAD_DIR, filename), Buffer.from(await file.arrayBuffer()));

  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarPath: true },
  });
  if (current?.avatarPath) {
    await unlink(join(UPLOAD_DIR, current.avatarPath)).catch(() => {});
  }

  await prisma.user.update({ where: { id: user.id }, data: { avatarPath: filename } });
  revalidatePath("/profile");
  return { success: true, data: undefined };
}

export async function removeAvatarAction(): Promise<ActionResult> {
  const user = await requireAuth();
  const current = await prisma.user.findUnique({
    where: { id: user.id },
    select: { avatarPath: true },
  });
  if (current?.avatarPath) {
    await unlink(join(UPLOAD_DIR, current.avatarPath)).catch(() => {});
  }
  await prisma.user.update({ where: { id: user.id }, data: { avatarPath: null } });
  revalidatePath("/profile");
  return { success: true, data: undefined };
}

export async function changePasswordAction(
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmNewPassword: formData.get("confirmNewPassword"),
  });
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const dbUser = await prisma.user.findUnique({ where: { id: user.id } });
  if (!dbUser) return { success: false, error: "User not found" };

  const valid = await bcrypt.compare(
    parsed.data.currentPassword,
    dbUser.passwordHash
  );
  if (!valid) return { success: false, error: "Current password is incorrect" };

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash: await bcrypt.hash(parsed.data.newPassword, 12) },
  });
  return { success: true, data: undefined };
}

// ── Admin actions ─────────────────────────────────────────────────────────────

async function requireAdmin() {
  const user = await requireAuth();
  if (!canManageUsers({ id: user.id, role: user.role as Role })) {
    throw new Error("Forbidden");
  }
  return user;
}

export async function adminCreateUserAction(
  formData: FormData
): Promise<ActionResult> {
  await requireAdmin();
  const raw = {
    email: formData.get("email"),
    displayName: formData.get("displayName"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  };
  const parsed = signUpSchema.safeParse(raw);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message };

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: parsed.data.email }, { displayName: parsed.data.displayName }],
    },
  });
  if (existing?.email === parsed.data.email) {
    return { success: false, error: "Email already in use" };
  }
  if (existing?.displayName === parsed.data.displayName) {
    return { success: false, error: "Display name already taken" };
  }

  await prisma.user.create({
    data: {
      email: parsed.data.email,
      displayName: parsed.data.displayName,
      passwordHash: await bcrypt.hash(parsed.data.password, 12),
    },
  });
  revalidatePath("/admin/users");
  return { success: true, data: undefined };
}

export async function adminResetPasswordAction(
  userId: string,
  newPassword: string
): Promise<ActionResult> {
  await requireAdmin();
  if (!newPassword || newPassword.length < 6) {
    return { success: false, error: "Password must be at least 6 characters" };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: await bcrypt.hash(newPassword, 12) },
  });
  revalidatePath("/admin/users");
  return { success: true, data: undefined };
}

export async function adminDeleteUserAction(
  userId: string
): Promise<ActionResult> {
  const me = await requireAdmin();
  if (userId === me.id) return { success: false, error: "Cannot delete yourself" };
  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/admin/users");
  return { success: true, data: undefined };
}
