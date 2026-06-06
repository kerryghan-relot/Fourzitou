"use client";

import { useActionState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { signUpSchema, type SignUpInput } from "@/lib/schemas";
import { signUpAction } from "@/server/actions/auth";
import { getPasswordStrength } from "@/lib/password";
import { Loader2 } from "lucide-react";
import { useWatch } from "react-hook-form";
import { cn } from "@/lib/utils";

function PasswordStrengthBar({ password }: { password: string }) {
  if (!password) return null;
  const { strength, score } = getPasswordStrength(password);
  const colors: Record<string, string> = {
    weak: "bg-red-500",
    fair: "bg-orange-400",
    good: "bg-yellow-400",
    strong: "bg-green-500",
  };
  return (
    <div className="space-y-1">
      <div className="flex gap-1">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              score >= i * 1.5 ? colors[strength] : "bg-border"
            )}
          />
        ))}
      </div>
      <p className="text-xs capitalize text-muted-foreground">{strength}</p>
    </div>
  );
}

export default function SignupPage() {
  const t = useTranslations();
  const [state, formAction, isPending] = useActionState(signUpAction, null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<SignUpInput>({ resolver: zodResolver(signUpSchema) });

  const passwordValue = useWatch({ control, name: "password", defaultValue: "" });

  function onSubmit(_data: SignUpInput, e?: React.BaseSyntheticEvent) {
    const form = e?.target as HTMLFormElement;
    if (form) formAction(new FormData(form));
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Fourzitou</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t("auth.signupSubtitle")}</p>
        </div>

        {state && !state.success && (
          <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              {t("auth.email")}
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="text-xs text-destructive">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="displayName" className="text-sm font-medium text-foreground">
              {t("auth.displayName")}
            </label>
            <input
              id="displayName"
              type="text"
              autoComplete="username"
              {...register("displayName")}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="cooluser42"
            />
            {errors.displayName && (
              <p className="text-xs text-destructive">{errors.displayName.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              {t("auth.password")}
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              {...register("password")}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <PasswordStrengthBar password={passwordValue} />
            {errors.password && (
              <p className="text-xs text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirmPassword"
              className="text-sm font-medium text-foreground"
            >
              {t("auth.confirmPassword")}
            </label>
            <input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              {...register("confirmPassword")}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isPending}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("auth.signup")}
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground">
          {t("auth.haveAccount")}{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            {t("auth.login")}
          </Link>
        </p>
      </div>
    </div>
  );
}
