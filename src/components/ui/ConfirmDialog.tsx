"use client";

import { useTranslations } from "next-intl";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

type Props = {
  message: string;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
  destructive?: boolean;
};

export function ConfirmDialog({ message, onConfirm, onCancel, destructive }: Props) {
  const t = useTranslations("common");
  const [pending, setPending] = useState(false);

  async function handleConfirm() {
    setPending(true);
    try {
      await onConfirm();
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-sm rounded-xl border border-border bg-card p-6 shadow-xl">
        <p className="text-sm text-foreground">{message}</p>
        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
          >
            {t("cancel")}
          </button>
          <button
            onClick={handleConfirm}
            disabled={pending}
            className={cn(
              "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-60",
              destructive ? "bg-destructive hover:opacity-90" : "bg-primary hover:opacity-90"
            )}
          >
            {pending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t("confirm")}
          </button>
        </div>
      </div>
    </div>
  );
}
