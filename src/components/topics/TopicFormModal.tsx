"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import EmojiPicker from "emoji-picker-react";
import { useState } from "react";
import { topicSchema, type TopicInput } from "@/lib/schemas";
import type { Topic } from "@/generated/prisma/client";
import { Loader2, Smile } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  topic?: Topic;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
};

const PRESET_COLORS = [
  "#ffffff", "#f87171", "#fb923c", "#facc15",
  "#4ade80", "#60a5fa", "#a78bfa", "#f472b6",
];

export function TopicFormModal({ topic, onClose, onSubmit }: Props) {
  const t = useTranslations("topics");
  const tc = useTranslations("common");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TopicInput>({
    resolver: zodResolver(topicSchema),
    defaultValues: {
      title: topic?.title ?? "",
      titleColor: topic?.titleColor ?? "#ffffff",
      emoji: topic?.emoji ?? "📋",
    },
  });

  const emoji = watch("emoji");
  const titleColor = watch("titleColor");

  async function onValid(data: TopicInput) {
    const fd = new FormData();
    fd.append("title", data.title);
    fd.append("titleColor", data.titleColor);
    fd.append("emoji", data.emoji);
    await onSubmit(fd);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-xl border border-border bg-card shadow-xl">
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">
            {topic ? t("edit") : t("create")}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("topicEmoji")}</label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setShowEmojiPicker((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-input bg-background px-3 py-2 text-sm"
              >
                <span className="text-xl">{emoji}</span>
                <Smile className="h-4 w-4 text-muted-foreground" />
              </button>
              {showEmojiPicker && (
                <div className="absolute left-0 top-12 z-50">
                  <EmojiPicker
                    onEmojiClick={(e) => {
                      setValue("emoji", e.emoji);
                      setShowEmojiPicker(false);
                    }}
                  />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("topicTitle")}</label>
            <input
              {...register("title")}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Movie night"
              style={{ color: titleColor }}
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("topicColor")}</label>
            <div className="flex flex-wrap gap-2">
              {PRESET_COLORS.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setValue("titleColor", color)}
                  className={cn(
                    "h-7 w-7 rounded-full border-2 transition-transform hover:scale-110",
                    titleColor === color ? "border-ring scale-110" : "border-transparent"
                  )}
                  style={{ backgroundColor: color }}
                />
              ))}
              <input
                type="color"
                {...register("titleColor")}
                className="h-7 w-7 cursor-pointer rounded-full border-2 border-transparent"
                title="Custom color"
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground transition-colors hover:bg-accent"
            >
              {tc("cancel")}
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
            >
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {tc("save")}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
