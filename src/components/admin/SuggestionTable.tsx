"use client";

import { useState, useTransition, useMemo, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import {
  Bug,
  Lightbulb,
  HelpCircle,
  ThumbsUp,
  ThumbsDown,
  Trash2,
  RotateCcw,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils";
import {
  adminUpdateSuggestionReactionAction,
  adminToggleRemoveSuggestionAction,
} from "@/server/actions/suggestions";
import { MarkdownRenderer } from "@/lib/markdown";

// ─── Types ────────────────────────────────────────────────────────────────────

type SuggestionType = "BUG" | "IDEA" | "OTHER";
type SuggestionReaction = "UP" | "DOWN";

export type SuggestionRow = {
  id: string;
  type: SuggestionType;
  title: string;
  description: string;
  imagePath: string | null;
  removed: boolean;
  reaction: SuggestionReaction | null;
  createdAt: Date | string;
  user: { displayName: string };
};

type SortColumn = "type" | "user" | "date";
type SortDir = "asc" | "desc";

type ColumnKey = "type" | "title" | "description" | "user" | "date";

const ALL_COLUMNS: ColumnKey[] = ["type", "title", "description", "user", "date"];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_META: Record<
  SuggestionType,
  { icon: React.ElementType; color: string; labelKey: "typeBug" | "typeIdea" | "typeOther" }
> = {
  BUG: { icon: Bug, color: "text-red-500", labelKey: "typeBug" },
  IDEA: { icon: Lightbulb, color: "text-amber-500", labelKey: "typeIdea" },
  OTHER: { icon: HelpCircle, color: "text-blue-500", labelKey: "typeOther" },
};

function reactionRank(r: SuggestionReaction | null) {
  if (r === "UP") return 2;
  if (r === "DOWN") return 0;
  return 1;
}

function sortRows(
  rows: SuggestionRow[],
  sortConfig: { column: SortColumn; direction: SortDir } | null
): SuggestionRow[] {
  const arr = [...rows];
  if (!sortConfig) {
    return arr.sort((a, b) => {
      const diff = reactionRank(b.reaction) - reactionRank(a.reaction);
      if (diff !== 0) return diff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    });
  }
  const dir = sortConfig.direction === "asc" ? 1 : -1;
  return arr.sort((a, b) => {
    switch (sortConfig.column) {
      case "type":
        return dir * a.type.localeCompare(b.type);
      case "user":
        return dir * a.user.displayName.localeCompare(b.user.displayName);
      case "date":
        return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    }
  });
}

// ─── Detail modal ─────────────────────────────────────────────────────────────

function DetailModal({
  suggestion,
  onClose,
}: {
  suggestion: SuggestionRow;
  onClose: () => void;
}) {
  const t = useTranslations("adminSuggestions");
  const ts = useTranslations("suggestions");
  const { icon: Icon, color, labelKey } = TYPE_META[suggestion.type];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-xl border border-border bg-card shadow-xl">
        {suggestion.removed && (
          <span className="absolute right-12 top-4 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            {t("removedBadge")}
          </span>
        )}

        <div className="flex items-center justify-between border-b border-border p-4">
          <div className="flex items-center gap-2">
            <Icon className={cn("h-5 w-5", color)} />
            <span className={cn("text-sm font-medium", color)}>{t(labelKey)}</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 p-4">
          <div>
            <p className="text-xs text-muted-foreground">
              {suggestion.user.displayName} · {formatDate(suggestion.createdAt)}
            </p>
            <h2 className="mt-1 text-lg font-semibold text-foreground">{suggestion.title}</h2>
          </div>

          <MarkdownRenderer content={suggestion.description} />

          {suggestion.imagePath && (
            <div>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/uploads/${suggestion.imagePath}`}
                alt={ts("labelImage")}
                className="max-h-96 w-auto rounded-lg border border-border object-contain"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Sortable column header ────────────────────────────────────────────────────

function SortableHeader({
  label,
  column,
  sortConfig,
  onSort,
}: {
  label: string;
  column: SortColumn;
  sortConfig: { column: SortColumn; direction: SortDir } | null;
  onSort: (col: SortColumn) => void;
}) {
  const active = sortConfig?.column === column;
  const Icon = active
    ? sortConfig!.direction === "asc"
      ? ChevronUp
      : ChevronDown
    : ChevronsUpDown;

  return (
    <th className="cursor-pointer select-none px-4 py-3 text-left" onClick={() => onSort(column)}>
      <span className="flex items-center gap-1">
        {label}
        <Icon
          className={cn("h-3 w-3", active ? "text-foreground" : "text-muted-foreground/50")}
        />
      </span>
    </th>
  );
}

// ─── Column visibility dropdown ───────────────────────────────────────────────

function ColumnVisibilityDropdown({
  hiddenColumns,
  onToggle,
}: {
  hiddenColumns: Set<ColumnKey>;
  onToggle: (col: ColumnKey) => void;
}) {
  const t = useTranslations("adminSuggestions");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const colLabel: Record<ColumnKey, string> = {
    type: t("colType"),
    title: t("colTitle"),
    description: t("colDescription"),
    user: t("colUser"),
    date: t("colDate"),
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-sm text-foreground hover:bg-accent"
      >
        <SlidersHorizontal className="h-4 w-4" />
        {t("toggleColumns")}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-10 mt-1 min-w-40 rounded-lg border border-border bg-card shadow-lg">
          {ALL_COLUMNS.map((col) => (
            <label
              key={col}
              className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
            >
              <input
                type="checkbox"
                checked={!hiddenColumns.has(col)}
                onChange={() => onToggle(col)}
                className="h-3.5 w-3.5 accent-primary"
              />
              {colLabel[col]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Toggle switch ────────────────────────────────────────────────────────────

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-sm text-muted-foreground select-none">
      <span
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors duration-200",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "inline-block h-3.5 w-3.5 rounded-full bg-white shadow-sm ring-0 transition-transform duration-200",
            checked ? "translate-x-4" : "translate-x-0.5"
          )}
        />
      </span>
      {label}
    </label>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

type Props = { suggestions: SuggestionRow[] };

export function SuggestionTable({ suggestions: initialSuggestions }: Props) {
  const t = useTranslations("adminSuggestions");
  const [, startTransition] = useTransition();
  const router = useRouter();

  const [rows, setRows] = useState<SuggestionRow[]>(initialSuggestions);
  const [sortConfig, setSortConfig] = useState<{
    column: SortColumn;
    direction: SortDir;
  } | null>(null);
  const [showRemoved, setShowRemoved] = useState(false);
  const [hiddenColumns, setHiddenColumns] = useState<Set<ColumnKey>>(new Set());
  const [detail, setDetail] = useState<SuggestionRow | null>(null);

  // Merge server-refreshed suggestions into local state (live reload every 30 s)
  useEffect(() => {
    setRows((prev) => {
      const localById = new Map(prev.map((r) => [r.id, r]));
      const merged = initialSuggestions.map((incoming) => {
        const local = localById.get(incoming.id);
        // Keep optimistic local mutations; add new rows from server
        return local ?? incoming;
      });
      // Keep any local rows not yet in server response (just submitted)
      const serverIds = new Set(initialSuggestions.map((r) => r.id));
      prev.forEach((r) => { if (!serverIds.has(r.id)) merged.push(r); });
      return merged;
    });
  }, [initialSuggestions]);

  // Poll for new submissions every 30 seconds
  useEffect(() => {
    const id = setInterval(() => router.refresh(), 30_000);
    return () => clearInterval(id);
  }, [router]);

  const visible = useMemo(() => {
    const filtered = showRemoved ? rows : rows.filter((r) => !r.removed);
    return sortRows(filtered, sortConfig);
  }, [rows, sortConfig, showRemoved]);

  function handleSort(col: SortColumn) {
    setSortConfig((prev) => {
      if (!prev || prev.column !== col) return { column: col, direction: "asc" };
      if (prev.direction === "asc") return { column: col, direction: "desc" };
      return null;
    });
  }

  function toggleColumn(col: ColumnKey) {
    setHiddenColumns((prev) => {
      const next = new Set(prev);
      if (next.has(col)) next.delete(col);
      else next.add(col);
      return next;
    });
  }

  // Fix: server actions called OUTSIDE setRows — state updaters must be pure
  function handleReaction(id: string, reaction: "UP" | "DOWN") {
    const current = rows.find((r) => r.id === id);
    if (!current) return;
    const next = current.reaction === reaction ? null : reaction;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, reaction: next } : r)));
    startTransition(async () => {
      await adminUpdateSuggestionReactionAction(id, next as "UP" | "DOWN" | null);
    });
  }

  function handleToggleRemove(id: string) {
    const current = rows.find((r) => r.id === id);
    if (!current) return;
    const nextRemoved = !current.removed;
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, removed: nextRemoved } : r)));
    startTransition(async () => {
      await adminToggleRemoveSuggestionAction(id);
    });
  }

  const isVisible = (col: ColumnKey) => !hiddenColumns.has(col);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-foreground">{t("sectionTitle")}</h2>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ToggleSwitch
          checked={showRemoved}
          onChange={setShowRemoved}
          label={t("showRemoved")}
        />
        <ColumnVisibilityDropdown hiddenColumns={hiddenColumns} onToggle={toggleColumn} />
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted text-xs font-medium text-muted-foreground">
              {isVisible("type") && (
                <SortableHeader
                  label={t("colType")}
                  column="type"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              )}
              {isVisible("title") && <th className="px-4 py-3 text-left">{t("colTitle")}</th>}
              {isVisible("description") && (
                <th className="px-4 py-3 text-left">{t("colDescription")}</th>
              )}
              {isVisible("user") && (
                <SortableHeader
                  label={t("colUser")}
                  column="user"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              )}
              {isVisible("date") && (
                <SortableHeader
                  label={t("colDate")}
                  column="date"
                  sortConfig={sortConfig}
                  onSort={handleSort}
                />
              )}
              <th className="px-4 py-3 text-right">{t("colActions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {visible.length === 0 && (
              <tr>
                <td
                  colSpan={ALL_COLUMNS.filter((c) => isVisible(c)).length + 1}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {t("noSubmissions")}
                </td>
              </tr>
            )}
            {visible.map((row) => {
              const { icon: Icon, color, labelKey } = TYPE_META[row.type];
              return (
                <tr
                  key={row.id}
                  onDoubleClick={() => setDetail(row)}
                  className={cn(
                    "cursor-pointer bg-card transition-colors hover:bg-accent/30",
                    row.removed && "opacity-40"
                  )}
                >
                  {isVisible("type") && (
                    <td className="px-4 py-3">
                      <span className={cn("flex items-center gap-1.5 font-medium", color)}>
                        <Icon className="h-4 w-4 shrink-0" />
                        {t(labelKey)}
                      </span>
                    </td>
                  )}
                  {isVisible("title") && (
                    <td className="max-w-[180px] px-4 py-3">
                      <p className="truncate font-medium text-foreground">{row.title}</p>
                    </td>
                  )}
                  {isVisible("description") && (
                    <td className="max-w-[240px] px-4 py-3">
                      <p className="line-clamp-2 text-xs text-muted-foreground">
                        {row.description}
                      </p>
                    </td>
                  )}
                  {isVisible("user") && (
                    <td className="px-4 py-3 text-muted-foreground">{row.user.displayName}</td>
                  )}
                  {isVisible("date") && (
                    <td className="whitespace-nowrap px-4 py-3 text-muted-foreground">
                      {formatDate(row.createdAt)}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction(row.id, "UP");
                        }}
                        title={t("thumbUp")}
                        className={cn(
                          "rounded p-1.5 transition-colors hover:bg-accent",
                          row.reaction === "UP"
                            ? "text-green-500"
                            : "text-muted-foreground hover:text-green-500"
                        )}
                      >
                        <ThumbsUp className="h-4 w-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleReaction(row.id, "DOWN");
                        }}
                        title={t("thumbDown")}
                        className={cn(
                          "rounded p-1.5 transition-colors hover:bg-accent",
                          row.reaction === "DOWN"
                            ? "text-red-500"
                            : "text-muted-foreground hover:text-red-500"
                        )}
                      >
                        <ThumbsDown className="h-4 w-4" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleToggleRemove(row.id);
                        }}
                        title={row.removed ? t("restore") : t("remove")}
                        className={cn(
                          "rounded p-1.5 transition-colors hover:bg-accent",
                          row.removed
                            ? "text-muted-foreground hover:text-foreground"
                            : "text-muted-foreground hover:text-destructive"
                        )}
                      >
                        {row.removed ? (
                          <RotateCcw className="h-4 w-4" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {detail && <DetailModal suggestion={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
