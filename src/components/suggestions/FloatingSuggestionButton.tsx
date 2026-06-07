"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations, useLocale } from "next-intl";
import {
  MessageSquarePlus,
  Bug,
  Lightbulb,
  HelpCircle,
  X,
  ImagePlus,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { createSuggestionAction, uploadSuggestionInlineImageAction } from "@/server/actions/suggestions";
import { MarkdownRenderer } from "@/lib/markdown";

// ─── Types ────────────────────────────────────────────────────────────────────

type SuggestionType = "BUG" | "IDEA" | "OTHER";

type TypeMeta = {
  value: SuggestionType;
  icon: React.ElementType;
  color: string;
  bg: string;
  selectedBorder: string;
  labelKey: "typeBug" | "typeIdea" | "typeOther";
  descKey: "typeBugDesc" | "typeIdeaDesc" | "typeOtherDesc";
};

const TYPES: TypeMeta[] = [
  {
    value: "BUG",
    icon: Bug,
    color: "text-red-500",
    bg: "bg-red-50 dark:bg-red-950/20",
    selectedBorder: "border-red-500",
    labelKey: "typeBug",
    descKey: "typeBugDesc",
  },
  {
    value: "IDEA",
    icon: Lightbulb,
    color: "text-amber-500",
    bg: "bg-amber-50 dark:bg-amber-950/20",
    selectedBorder: "border-amber-500",
    labelKey: "typeIdea",
    descKey: "typeIdeaDesc",
  },
  {
    value: "OTHER",
    icon: HelpCircle,
    color: "text-blue-500",
    bg: "bg-blue-50 dark:bg-blue-950/20",
    selectedBorder: "border-blue-500",
    labelKey: "typeOther",
    descKey: "typeOtherDesc",
  },
];

// ─── Pun phrases (locale-aware easter egg) ────────────────────────────────────

const PUN_PHRASES: Record<string, string[]> = {
  en: [
    "Well, what will I do with this piece of magnificence? 🌟",
    "Congratulations, you have successfully pressed a button.",
    "We'll get right on that... eventually... probably. ☕",
    "This has been noted in the Great Book of Suggestions (page 404). 📚",
    "Your submission has been received with moderate enthusiasm.",
    "Legend says this feedback will change everything. Legend is optimistic. 🦄",
    "Our dev team will stare at this for 3 hours and close it as 'by design'. ✨",
    "Somewhere, a bug just got a little nervous. 🐛",
    "Your idea has been added to the pile. The pile is now very tall. 📦",
    "Incredible. We have absolutely no idea what to do with this. 😅",
    "Five stars for effort. Zero stars for making us do more work. ⭐",
    "This has been forwarded to the intern who starts next quarter.",
  ],
  fr: [
    "Et bien, qu'est-ce que je vais faire de ce chef-d'œuvre ? 🌟",
    "Félicitations, vous avez appuyé avec succès sur un bouton.",
    "On s'en occupe... éventuellement... peut-être. ☕",
    "Cela a été consigné dans le Grand Livre des Suggestions (page 404). 📚",
    "Votre retour a été reçu avec un enthousiasme modéré.",
    "La légende dit que ce retour va tout changer. La légende est optimiste. 🦄",
    "Notre équipe va contempler ça 3 heures et fermer le ticket comme 'comportement voulu'. ✨",
    "Quelque part, un bug vient de frissonner. 🐛",
    "Votre idée a été ajoutée à la pile. La pile est maintenant très haute. 📦",
    "Incroyable. On n'a absolument aucune idée de quoi faire avec ça. 😅",
    "Cinq étoiles pour l'effort. Zéro étoile pour nous donner plus de travail. ⭐",
    "Ça a été transmis au stagiaire qui commence le trimestre prochain.",
  ],
};

function useRandomPun() {
  const locale = useLocale();
  return () => {
    const phrases = PUN_PHRASES[locale] ?? PUN_PHRASES.en;
    return phrases[Math.floor(Math.random() * phrases.length)];
  };
}

// ─── Modal ───────────────────────────────────────────────────────────────────

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onCancel: () => void;
};

function SuggestionFormModal({ isOpen, onClose, onCancel }: ModalProps) {
  const t = useTranslations("suggestions");
  const tc = useTranslations("common");
  const getRandomPun = useRandomPun();

  const [selectedType, setSelectedType] = useState<SuggestionType>("BUG");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [descMode, setDescMode] = useState<"write" | "preview">("write");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isPending, setIsPending] = useState(false);
  const [successPun, setSuccessPun] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function resetForm() {
    setSelectedType("BUG");
    setTitle("");
    setDescription("");
    setDescMode("write");
    setImageFile(null);
    setImagePreview(null);
    setErrors({});
    setIsPending(false);
    setSuccessPun(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  const handleMainImageSelected = useCallback((file: File) => {
    if (!file.type.startsWith("image/")) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setErrors((prev) => ({ ...prev, image: "" }));
  }, []);

  // Paste into the main image drop zone (global, skips description textarea)
  useEffect(() => {
    if (!isOpen) return;
    function handlePaste(e: ClipboardEvent) {
      if (e.target === textareaRef.current) return; // Let textarea handle inline images
      const items = Array.from(e.clipboardData?.items ?? []);
      const imageItem = items.find((item) => item.type.startsWith("image/"));
      if (imageItem) {
        const file = imageItem.getAsFile();
        if (file) handleMainImageSelected(file);
      }
    }
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [isOpen, handleMainImageSelected]);

  function clearImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileRef.current) fileRef.current.value = "";
  }

  // Insert text at the textarea cursor position
  function insertAtCursor(text: string) {
    const ta = textareaRef.current;
    if (!ta) {
      setDescription((prev) => prev + text);
      return;
    }
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const newValue = description.slice(0, start) + text + description.slice(end);
    setDescription(newValue);
    // Restore cursor after the inserted text
    requestAnimationFrame(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + text.length;
    });
  }

  // Handle image paste in the description textarea → inline upload
  async function handleDescriptionPaste(e: React.ClipboardEvent<HTMLTextAreaElement>) {
    const items = Array.from(e.clipboardData.items);
    const imageItem = items.find((item) => item.type.startsWith("image/"));
    if (!imageItem) return; // Normal text paste — let it through
    e.preventDefault();

    const file = imageItem.getAsFile();
    if (!file) return;

    const placeholderId = `upload-${Date.now()}`;
    const placeholder = `![${t("imageUploading")}](${placeholderId})`;
    insertAtCursor(placeholder);

    const fd = new FormData();
    fd.set("image", file);
    const result = await uploadSuggestionInlineImageAction(fd);

    setDescription((prev) => {
      if (result.success) {
        return prev.replace(placeholder, `![image](/api/uploads/${result.data.imagePath})`);
      }
      return prev.replace(placeholder, `*(${t("imageUploadError")})*`);
    });
  }

  // Handle image drop on the description textarea → inline upload
  async function handleDescriptionDrop(e: React.DragEvent<HTMLTextAreaElement>) {
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (!file) return;
    e.preventDefault();

    const placeholderId = `upload-${Date.now()}`;
    const placeholder = `![${t("imageUploading")}](${placeholderId})`;
    insertAtCursor(placeholder);

    const fd = new FormData();
    fd.set("image", file);
    const result = await uploadSuggestionInlineImageAction(fd);

    setDescription((prev) => {
      if (result.success) {
        return prev.replace(placeholder, `![image](/api/uploads/${result.data.imagePath})`);
      }
      return prev.replace(placeholder, `*(${t("imageUploadError")})*`);
    });
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) newErrors.title = t("errorTitleRequired");
    if (!description.trim()) newErrors.description = t("errorDescriptionRequired");
    if (selectedType === "BUG" && !imageFile) newErrors.image = t("errorImageRequired");

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    setIsPending(true);

    const fd = new FormData();
    fd.set("type", selectedType);
    fd.set("title", title.trim());
    fd.set("description", description.trim());
    if (imageFile) fd.set("image", imageFile);

    const result = await createSuggestionAction(fd);
    setIsPending(false);

    if (!result.success) {
      setErrors({ submit: result.error });
      return;
    }

    setSuccessPun(getRandomPun());
    setTimeout(() => {
      resetForm();
      onClose();
    }, 4000);
  }

  function handleCancel() {
    resetForm();
    onCancel();
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div
      className={cn(
        "fixed inset-0 z-50 flex items-end justify-start p-4 sm:items-center sm:justify-start sm:pl-6 sm:pb-24",
        "bg-black/40 backdrop-blur-sm transition-opacity duration-200",
        isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
      )}
      onClick={handleBackdropClick}
      aria-hidden={!isOpen}
    >
      <div
        className={cn(
          "w-full max-w-lg rounded-xl border border-border bg-card shadow-2xl transition-transform duration-200",
          isOpen ? "scale-100" : "scale-95"
        )}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="text-lg font-semibold text-foreground">{t("formTitle")}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Success state */}
        {successPun !== null ? (
          <div className="flex flex-col items-center gap-4 p-8 text-center">
            <CheckCircle2 className="h-12 w-12 text-green-500" />
            <div>
              <p className="text-base font-semibold text-foreground">{t("successTitle")}</p>
              <p className="mt-1 text-sm text-muted-foreground">{t("successMessage")}</p>
            </div>
            <p className="rounded-lg border border-border bg-muted px-4 py-2 text-xs italic text-muted-foreground">
              ({successPun})
            </p>
          </div>
        ) : (
          <form onSubmit={handleSend} className="space-y-4 p-4">
            {/* Type selector */}
            <div className="grid grid-cols-3 gap-2">
              {TYPES.map(({ value, icon: Icon, color, bg, selectedBorder, labelKey, descKey }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => {
                    setSelectedType(value);
                    setErrors((prev) => ({ ...prev, image: "" }));
                  }}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-xs font-medium transition-colors",
                    selectedType === value
                      ? cn(bg, selectedBorder, color)
                      : "border-border bg-background text-muted-foreground hover:bg-accent"
                  )}
                >
                  <Icon className={cn("h-5 w-5", selectedType === value && color)} />
                  <span>{t(labelKey)}</span>
                  <span className="text-[10px] font-normal opacity-70">{t(descKey)}</span>
                </button>
              ))}
            </div>

            {/* Title */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {t("labelTitle")} <span className="text-destructive">*</span>
              </label>
              <input
                value={title}
                onChange={(e) => {
                  setTitle(e.target.value);
                  if (e.target.value.trim()) setErrors((prev) => ({ ...prev, title: "" }));
                }}
                placeholder={t("placeholderTitle")}
                className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
              {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
            </div>

            {/* Description with Write/Preview tabs */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-foreground">
                  {t("labelDescription")} <span className="text-destructive">*</span>
                </label>
                <div className="flex rounded-lg border border-border text-xs">
                  <button
                    type="button"
                    onClick={() => setDescMode("write")}
                    className={cn(
                      "rounded-l-lg px-3 py-1 transition-colors",
                      descMode === "write"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {t("descWrite")}
                  </button>
                  <button
                    type="button"
                    onClick={() => setDescMode("preview")}
                    className={cn(
                      "rounded-r-lg px-3 py-1 transition-colors",
                      descMode === "preview"
                        ? "bg-primary text-primary-foreground"
                        : "text-muted-foreground hover:bg-accent"
                    )}
                  >
                    {t("descPreview")}
                  </button>
                </div>
              </div>

              {descMode === "write" ? (
                <textarea
                  ref={textareaRef}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (e.target.value.trim()) setErrors((prev) => ({ ...prev, description: "" }));
                  }}
                  onPaste={handleDescriptionPaste}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={handleDescriptionDrop}
                  rows={5}
                  placeholder={t("placeholderDescription")}
                  className="w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                />
              ) : (
                <div className="min-h-[120px] w-full rounded-lg border border-input bg-background px-3 py-2">
                  {description.trim() ? (
                    <MarkdownRenderer content={description} />
                  ) : (
                    <p className="text-sm text-muted-foreground">{t("placeholderDescription")}</p>
                  )}
                </div>
              )}
              {errors.description && (
                <p className="text-xs text-destructive">{errors.description}</p>
              )}
            </div>

            {/* Main image attachment */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium text-foreground">
                {selectedType === "BUG" ? (
                  <>
                    {t("labelImageRequired")} <span className="text-destructive">*</span>
                  </>
                ) : (
                  t("labelImage")
                )}
              </label>

              {imagePreview ? (
                <div className="relative inline-block">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={imagePreview}
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
                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDragging(true);
                  }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={(e) => {
                    e.preventDefault();
                    setIsDragging(false);
                    const file = e.dataTransfer.files[0];
                    if (file) handleMainImageSelected(file);
                  }}
                  className={cn(
                    "flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-5 text-sm text-muted-foreground transition-colors",
                    isDragging
                      ? "border-ring bg-accent/30"
                      : "border-border hover:border-ring hover:text-foreground"
                  )}
                  onClick={() => fileRef.current?.click()}
                >
                  <ImagePlus className="h-5 w-5" />
                  <span>{t("imageHint")}</span>
                </div>
              )}

              <input
                ref={fileRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleMainImageSelected(file);
                }}
                className="hidden"
              />
              {errors.image && <p className="text-xs text-destructive">{errors.image}</p>}
            </div>

            {errors.submit && (
              <p className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {errors.submit}
              </p>
            )}

            {/* Required fields footnote + footer buttons */}
            <div className="space-y-3 border-t border-border pt-4">
              <p className="text-xs text-muted-foreground">{t("requiredNote")}</p>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-accent"
                >
                  {tc("cancel")}
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
                >
                  {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  {t("send")}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

// ─── Floating button ──────────────────────────────────────────────────────────

export function FloatingSuggestionButton() {
  const t = useTranslations("suggestions");
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label={t("buttonLabel")}
        title={t("buttonLabel")}
        className="fixed bottom-6 left-6 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110 hover:opacity-90"
      >
        <MessageSquarePlus className="h-5 w-5" />
      </button>

      {/* Always mounted to preserve form draft on close */}
      <SuggestionFormModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onCancel={() => setIsOpen(false)}
      />
    </>
  );
}
