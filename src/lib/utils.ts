import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import {
  format,
  formatDistanceToNowStrict,
  isToday,
  isTomorrow,
  isThisYear,
  isPast,
} from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "12 Mar 2025" — or "12 Mar" when it's the current year. */
export function formatDate(date: Date | string): string {
  const d = new Date(date);
  return format(d, isThisYear(d) ? "d MMM" : "d MMM yyyy");
}

export function formatFullDate(date: Date | string): string {
  return format(new Date(date), "EEEE, d MMMM yyyy");
}

export function formatTime(date: Date | string): string {
  return format(new Date(date), "h:mm a");
}

export function formatDateTime(date: Date | string): string {
  const d = new Date(date);
  return `${formatDate(d)} · ${formatTime(d)}`;
}

/** Human-friendly relative label used across dashboards and lists. */
export function relativeDay(date: Date | string): string {
  const d = new Date(date);
  if (isToday(d)) return "Today";
  if (isTomorrow(d)) return "Tomorrow";
  return formatDate(d);
}

export function timeAgo(date: Date | string): string {
  const d = new Date(date);
  if (!isPast(d)) return `in ${formatDistanceToNowStrict(d)}`;
  return `${formatDistanceToNowStrict(d)} ago`;
}

/** Turns a title into a URL-safe slug. */
export function slugify(input: string): string {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Appends -2, -3, ... until the slug isn't taken. */
export async function uniqueSlug(
  base: string,
  exists: (slug: string) => Promise<boolean>,
): Promise<string> {
  const root = slugify(base) || "item";
  let candidate = root;
  let n = 2;
  while (await exists(candidate)) {
    candidate = `${root}-${n++}`;
    if (n > 200) return `${root}-${Date.now()}`;
  }
  return candidate;
}

export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function truncate(s: string, max = 160): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

/** Strips markdown-ish noise so body text can be used as a list preview. */
export function toPlainText(s: string): string {
  return s
    .replace(/[#*_>`]/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}
