"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { User, Shield, BarChart2, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/settings/profile", labelKey: "tabProfile", icon: User },
  { href: "/settings/security", labelKey: "tabSecurity", icon: Shield },
  { href: "/settings/stats", labelKey: "tabStats", icon: BarChart2 },
] as const;

const ADMIN_TAB = {
  href: "/settings/admin",
  labelKey: "tabAdmin",
  icon: ShieldCheck,
} as const;

export function SettingsSidebar({ userRole }: { userRole: string }) {
  const t = useTranslations("settings");
  const pathname = usePathname();

  const tabs = userRole === "ADMIN" ? [...TABS, ADMIN_TAB] : [...TABS];

  return (
    <nav className="w-44 shrink-0 space-y-1 pt-1">
      {tabs.map(({ href, labelKey, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
            pathname === href
              ? "bg-accent text-accent-foreground"
              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          {t(labelKey)}
        </Link>
      ))}
    </nav>
  );
}
