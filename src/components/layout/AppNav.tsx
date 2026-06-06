"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import {
  LayoutGrid,
  Settings,
  LogOut,
  Moon,
  Sun,
  Monitor,
  ChevronDown,
} from "lucide-react";
import { cn, getInitials } from "@/lib/utils";
import { useEffect, useState, useRef } from "react";

type Theme = "light" | "dark" | "auto";

function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("auto");

  useEffect(() => {
    setTheme((localStorage.getItem("theme") as Theme) ?? "auto");
  }, []);

  function applyTheme(next: Theme) {
    setTheme(next);
    localStorage.setItem("theme", next);
    const isDark =
      next === "dark" ||
      (next === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);
    document.documentElement.classList.toggle("dark", isDark);
  }

  const icons: Record<Theme, React.ReactNode> = {
    light: <Sun className="h-4 w-4" />,
    dark: <Moon className="h-4 w-4" />,
    auto: <Monitor className="h-4 w-4" />,
  };
  const cycle: Record<Theme, Theme> = { light: "dark", dark: "auto", auto: "light" };

  return (
    <button
      onClick={() => applyTheme(cycle[theme])}
      title={`Theme: ${theme}`}
      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
    >
      {icons[theme]}
    </button>
  );
}

type NavUser = {
  id: string;
  name?: string | null;
  role: string;
  avatarPath?: string | null;
};

function UserMenu({ user }: { user: NavUser }) {
  const t = useTranslations("nav");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  const displayName = user.name ?? "User";

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
      >
        <div className="h-7 w-7 shrink-0 overflow-hidden rounded-full bg-accent ring-1 ring-border">
          {user.avatarPath ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={`/api/uploads/${user.avatarPath}`}
              alt={displayName}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-xs font-bold text-accent-foreground">
              {getInitials(displayName)}
            </div>
          )}
        </div>
        <span className="hidden max-w-[120px] truncate sm:inline">{displayName}</span>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-44 overflow-hidden rounded-xl border border-border bg-popover shadow-lg">
          <Link
            href="/settings"
            onClick={() => setOpen(false)}
            className="flex items-center gap-2 px-3 py-2.5 text-sm text-foreground hover:bg-accent"
          >
            <Settings className="h-4 w-4" />
            {t("settings")}
          </Link>
          <div className="border-t border-border" />
          <button
            onClick={() => {
              setOpen(false);
              signOut({ callbackUrl: "/login" });
            }}
            className="flex w-full items-center gap-2 px-3 py-2.5 text-sm text-destructive hover:bg-accent"
          >
            <LogOut className="h-4 w-4" />
            {t("logout")}
          </button>
        </div>
      )}
    </div>
  );
}

export function AppNav({ user }: { user: NavUser }) {
  const t = useTranslations("nav");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="container mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-1">
          <Link href="/topics" className="mr-2 text-lg font-bold text-foreground">
            Fourzitou
          </Link>
          <Link
            href="/topics"
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              pathname.startsWith("/topics")
                ? "bg-accent text-accent-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            )}
          >
            <LayoutGrid className="h-4 w-4" />
            <span className="hidden sm:inline">{t("topics")}</span>
          </Link>
        </div>

        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </div>
    </header>
  );
}
