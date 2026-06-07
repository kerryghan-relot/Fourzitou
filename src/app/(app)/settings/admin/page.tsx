import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { canManageUsers } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";
import { UserManagementPanel } from "@/components/admin/UserManagementPanel";
import { SuggestionTable } from "@/components/admin/SuggestionTable";

export default async function SettingsAdminPage() {
  const session = await auth();
  const t = await getTranslations("admin");

  if (!canManageUsers({ id: session!.user.id, role: session!.user.role as Role })) {
    redirect("/topics");
  }

  const [users, suggestions] = await Promise.all([
    prisma.user.findMany({
      select: { id: true, email: true, displayName: true, role: true, createdAt: true },
      orderBy: { createdAt: "asc" },
    }),
    prisma.suggestion.findMany({
      include: { user: { select: { displayName: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-10">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <UserManagementPanel users={users} currentUserId={session!.user.id} />
      </div>

      <div className="border-t border-border pt-8">
        <SuggestionTable suggestions={suggestions} />
      </div>
    </div>
  );
}
