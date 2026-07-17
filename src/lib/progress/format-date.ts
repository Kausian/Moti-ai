// Readable, locale-aware dates via native Intl — no date library needed.
//
// Relative phrasing is computed against an injected `now` so it is pure and
// testable, and it stays coarse (days) because review scheduling is day-grained.

import { MILLISECONDS_PER_DAY } from "./constants";

const ABSOLUTE = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

/** Whole days between two instants, by calendar-ish rounding. */
function dayDelta(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MILLISECONDS_PER_DAY);
}

export function formatAbsoluteDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return ABSOLUTE.format(date);
}

/** e.g. "Due today", "Due in 3 days", "Overdue by 2 days". */
export function formatDueLabel(iso: string, now: Date): string {
  const due = new Date(iso);
  if (Number.isNaN(due.getTime())) return "Unknown date";

  const days = dayDelta(now, due);
  if (due.getTime() <= now.getTime()) {
    const overdue = Math.abs(days);
    if (overdue === 0) return "Due now";
    return `Overdue by ${overdue} day${overdue === 1 ? "" : "s"}`;
  }
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

/** e.g. "Practised today", "Practised 3 days ago". */
export function formatLastActivity(iso: string, now: Date): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";

  const days = dayDelta(date, now);
  if (days <= 0) return "Practised today";
  if (days === 1) return "Practised yesterday";
  if (days < 7) return `Practised ${days} days ago`;
  return `Practised ${formatAbsoluteDate(iso)}`;
}
