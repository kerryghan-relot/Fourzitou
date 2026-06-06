import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string, locale: string = "en"): string {
  return new Intl.DateTimeFormat(locale, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function formatRelative(date: Date | string, locale: string = "en"): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diff = (new Date(date).getTime() - Date.now()) / 1000;

  const MINUTE = 60;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;
  const WEEK = 7 * DAY;
  const MONTH = 30 * DAY;

  if (Math.abs(diff) < MINUTE) return rtf.format(Math.round(diff), "second");
  if (Math.abs(diff) < HOUR) return rtf.format(Math.round(diff / MINUTE), "minute");
  if (Math.abs(diff) < DAY) return rtf.format(Math.round(diff / HOUR), "hour");
  if (Math.abs(diff) < WEEK) return rtf.format(Math.round(diff / DAY), "day");
  if (Math.abs(diff) < MONTH) return rtf.format(Math.round(diff / WEEK), "week");
  return rtf.format(Math.round(diff / MONTH), "month");
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}
