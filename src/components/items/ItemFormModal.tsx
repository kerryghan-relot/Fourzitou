"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useTranslations } from "next-intl";
import { useRef, useState } from "react";
import { itemSchema, type ItemInput } from "@/lib/schemas";
import { Loader2, ImagePlus, X } from "lucide-react";

type ItemSnapshot = { title: string; description: string; imagePath: string | null };

type Props = {
  topicId: string;
  item?: ItemSnapshot;
  onClose: () => void;
  onSubmit: (formData: FormData) => Promise<void>;
};

export function ItemFormModal({ item, onClose, onSubmit }: Props) {
  const t = useTranslations("items");
  const tc = useTranslations("common");
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(
    item?.imagePath ? `/api/uploads/${item.imagePath}` : null
  );
  const [removeImage, setRemoveImage] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ItemInput>({
    resolver: zodResolver(itemSchema),
    defaultValues: { title: item?.title ?? "", description: item?.description ?? "" },
  });

  async function onValid(data: ItemInput, e?: React.BaseSyntheticEvent) {
    const form = e?.target as HTMLFormElement;
    const fd = new FormData(form ?? undefined);
    fd.set("title", data.title);
    fd.set("description", data.description);
    if (removeImage) fd.set("removeImage", "true");
    await onSubmit(fd);
  }

  function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (f) {
      setPreview(URL.createObjectURL(f));
      setRemoveImage(false);
    }
  }

  function clearImage() {
    setPreview(null);
    setRemoveImage(true);
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-lg rounded-xl border border-border bg-card shadow-xl">
        <div className="border-b border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">
            {item ? t("edit") : t("create")}
          </h2>
        </div>

        <form onSubmit={handleSubmit(onValid)} className="space-y-4 p-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("itemTitle")}</label>
            <input
              {...register("title")}
              className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="My awesome idea"
            />
            {errors.title && (
              <p className="text-xs text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("description")}</label>
            <textarea
              {...register("description")}
              rows={4}
              className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              placeholder="Describe it... (Markdown supported)"
            />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium text-foreground">{t("image")}</label>
            {preview ? (
              <div className="relative inline-block">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={preview}
                  alt="Preview"
                  className="h-32 w-auto rounded-lg object-cover"
                />
                <button
                  type="button"
                  onClick={clearImage}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-0.5 text-white"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-ring hover:text-foreground"
              >
                <ImagePlus className="h-4 w-4" />
                Add image
              </button>
            )}
            <input
              ref={fileRef}
              type="file"
              name="image"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={onFileChange}
              className="hidden"
            />
          </div>

          <div className="flex justify-end gap-2 border-t border-border pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
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
