// Pure duplicate detection using stable metadata. A full content hash is
// intentionally avoided to keep this simple; filename + size + character count
// are strong-enough signals for a prototype. Existing documents are never
// silently replaced — callers surface a duplicate error instead.

import type { KnowledgeDocument } from "@/lib/types";

export interface DuplicateCandidate {
  title: string;
  originalFileName?: string;
  sizeBytes?: number;
  characterCount: number;
}

function normalize(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function findDuplicate(
  existing: KnowledgeDocument[],
  candidate: DuplicateCandidate,
): KnowledgeDocument | undefined {
  return existing.find((document) => {
    const sameTitle = normalize(document.title) === normalize(candidate.title);
    const sameFileName =
      !!candidate.originalFileName &&
      !!document.originalFileName &&
      normalize(document.originalFileName) === normalize(candidate.originalFileName);
    const sameSize =
      candidate.sizeBytes !== undefined &&
      document.sizeBytes !== undefined &&
      document.sizeBytes === candidate.sizeBytes;
    const sameLength = document.characterCount === candidate.characterCount;

    if (sameFileName && sameLength) return true;
    if (sameFileName && sameSize) return true;
    if (sameTitle && sameLength) return true;
    return false;
  });
}
