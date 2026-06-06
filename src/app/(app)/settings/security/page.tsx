import { getTranslations } from "next-intl/server";
import { PasswordChangeForm } from "@/components/settings/PasswordChangeForm";

export default async function SettingsSecurityPage() {
  const t = await getTranslations("settings");

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-2xl font-bold text-foreground">{t("securityTitle")}</h1>
      <div className="rounded-xl border border-border bg-card p-6">
        <h2 className="mb-4 text-base font-semibold text-foreground">{t("password")}</h2>
        <PasswordChangeForm />
      </div>
    </div>
  );
}
