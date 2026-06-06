"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { changePasswordAction } from "@/server/actions/users";
import { getPasswordStrength } from "@/lib/password";
import { cn } from "@/lib/utils";

const STRENGTH_COLORS = {
  weak: "bg-destructive",
  fair: "bg-orange-400",
  good: "bg-yellow-400",
  strong: "bg-green-500",
} as const;

const STRENGTH_WIDTHS = {
  weak: "w-1/4",
  fair: "w-2/4",
  good: "w-3/4",
  strong: "w-full",
} as const;

export function PasswordChangeForm() {
  const t = useTranslations("settings");
  const tc = useTranslations("common");

  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const [isPending, startTransition] = useTransition();

  const strength = next.length > 0 ? getPasswordStrength(next) : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    const fd = new FormData();
    fd.set("currentPassword", current);
    fd.set("newPassword", next);
    fd.set("confirmNewPassword", confirm);
    startTransition(async () => {
      const result = await changePasswordAction(fd);
      if (!result.success) {
        setError(result.error ?? tc("error"));
      } else {
        setOk(true);
        setCurrent("");
        setNext("");
        setConfirm("");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Current password */}
      <div className="space-y-1.5">
        <label htmlFor="cp-current" className="text-sm font-medium text-foreground">{t("currentPassword")}</label>
        <div className="relative">
          <input
            id="cp-current"
            type={showCurrent ? "text" : "password"}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowCurrent((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showCurrent ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* New password */}
      <div className="space-y-1.5">
        <label htmlFor="cp-new" className="text-sm font-medium text-foreground">{t("newPassword")}</label>
        <div className="relative">
          <input
            id="cp-new"
            type={showNext ? "text" : "password"}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            minLength={6}
            required
            className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="button"
            onClick={() => setShowNext((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            {showNext ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>

        {/* Strength meter */}
        {strength && (
          <div className="space-y-2">
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  STRENGTH_COLORS[strength.strength],
                  STRENGTH_WIDTHS[strength.strength]
                )}
              />
            </div>
            <ul className="space-y-1">
              {(
                [
                  ["minLength", t("criteriaMinLength")] ,
                  ["uppercase", t("criteriaUppercase")],
                  ["lowercase", t("criteriaLowercase")],
                ] as const
              ).map(([key, label]) => (
                <li
                  key={key}
                  className={cn(
                    "flex items-center gap-1.5 text-xs",
                    strength.criteria[key]
                      ? "text-green-600 dark:text-green-400"
                      : "text-muted-foreground"
                  )}
                >
                  {strength.criteria[key] ? (
                    <Check className="h-3 w-3 shrink-0" />
                  ) : (
                    <X className="h-3 w-3 shrink-0" />
                  )}
                  {label}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Confirm */}
      <div className="space-y-1.5">
        <label htmlFor="cp-confirm" className="text-sm font-medium text-foreground">{t("confirmNewPassword")}</label>
        <input
          id="cp-confirm"
          type="password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          required
          className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}
      {ok && <p className="text-sm text-green-600 dark:text-green-400">{t("passwordUpdated")}</p>}

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isPending}
          className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
        >
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
          {tc("save")}
        </button>
      </div>
    </form>
  );
}
