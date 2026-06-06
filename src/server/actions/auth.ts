"use server";

import { prisma } from "@/lib/db";
import { signUpSchema } from "@/lib/schemas";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";

export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };

export async function signUpAction(
  _prev: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const raw = Object.fromEntries(formData.entries());
  const parsed = signUpSchema.safeParse(raw);

  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message };
  }

  const { email, displayName, password } = parsed.data;

  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { displayName }] },
  });

  if (existing?.email === email) {
    return { success: false, error: "Email already in use" };
  }
  if (existing?.displayName === displayName) {
    return { success: false, error: "Display name already taken" };
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: { email, displayName, passwordHash },
  });

  redirect("/login?registered=true");
}
