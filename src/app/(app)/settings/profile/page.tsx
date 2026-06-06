import { auth } from "@/auth";
import { prisma } from "@/lib/db";
import { getTranslations } from "next-intl/server";
import { ProfileForm } from "@/components/profile/ProfileForm";

export default async function SettingsProfilePage() {
  const session = await auth();
  const t = await getTranslations("profile");

  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { displayName: true, email: true, avatarPath: true, locale: true },
  });

  if (!user) return null;

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
      <div className="rounded-xl border border-border bg-card p-6">
        <ProfileForm user={user} />
      </div>
    </div>
  );
}
