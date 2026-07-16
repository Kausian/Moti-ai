// Pure formatting + calculation helpers for document metadata display.

import type { KnowledgeDocument } from "@/lib/types";

/** Sums the extracted-character counts across a set of documents. */
export function totalCharacterCount(documents: KnowledgeDocument[]): number {
  return documents.reduce((sum, document) => sum + document.characterCount, 0);
}

/** Formats a byte count as a short human-readable size. */
export function formatBytes(bytes: number | undefined): string {
  if (bytes === undefined || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb < 10 ? kb.toFixed(1) : Math.round(kb)} KB`;
  const mb = kb / 1024;
  return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
}

/** Formats a character count with thousands separators. */
export function formatCharacterCount(count: number): string {
  return `${count.toLocaleString("en-US")} character${count === 1 ? "" : "s"}`;
}

/** Formats an ISO timestamp as a short, locale-friendly date. */
export function formatAddedDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
