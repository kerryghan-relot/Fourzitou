import { auth } from "@/auth";
import { getTranslations } from "next-intl/server";
import { SettingsSidebar } from "@/components/layout/SettingsSidebar";

export default async function SettingsLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const t = await getTranslations("settings");

  return (
    <div className="flex gap-8">
      <aside className="shrink-0">
        <p className="mb-3 px-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {t("title")}
        </p>
        <SettingsSidebar userRole={session?.user?.role ?? "USER"} />
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
