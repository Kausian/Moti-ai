// Deterministic concept identity.
//
// A concept is identified by where it came from, not by its display text:
// `courseId:sourceDocumentId:normalized-title`. The original title is stored
// separately for display, so re-casing or re-spacing a heading never creates a
// duplicate concept, and two courses (or two documents) never collide.
//
// No hashing: a readable id is easier to debug and inspect in devtools, and there
// is nothing secret about a section heading.

/** Unicode combining marks (U+0300–U+036F), stripped after NFKD normalization. */
const COMBINING_MARKS = /[̀-ͯ]/g;
const NON_SLUG_CHARACTERS = /[^a-z0-9]+/g;
const EDGE_SEPARATORS = /^-+|-+$/g;

/**
 * Normalizes a concept title into a stable id segment: Unicode-normalized,
 * lowercased, accents stripped, and any run of unsupported characters collapsed
 * to a single hyphen.
 *
 * Returns an empty string when nothing usable remains — callers must treat that
 * as "no concept identity" rather than minting an id ending in a bare separator.
 */
export function normalizeConceptTitle(title: string): string {
  return title
    .normalize("NFKD")
    // So "Café" and "Cafe" resolve to the same concept.
    .replace(COMBINING_MARKS, "")
    .toLowerCase()
    .replace(NON_SLUG_CHARACTERS, "-")
    .replace(EDGE_SEPARATORS, "");
}

export interface ConceptIdInput {
  courseId: string;
  sourceDocumentId: string;
  /** Preferred identity when present. */
  sectionHeading?: string;
  /** Fallback when there is no section heading. */
  conceptTitle: string;
}

/**
 * Builds the stable concept id, preferring the source's section heading and
 * falling back to the concept title. Returns null when no usable id can be
 * formed, so an empty or symbol-only heading can never produce a broken id.
 */
export function buildConceptId(input: ConceptIdInput): string | null {
  const courseId = input.courseId.trim();
  const documentId = input.sourceDocumentId.trim();
  if (courseId.length === 0 || documentId.length === 0) return null;

  const heading = normalizeConceptTitle(input.sectionHeading ?? "");
  const title = normalizeConceptTitle(input.conceptTitle);
  const slug = heading.length > 0 ? heading : title;
  if (slug.length === 0) return null;

  return `${courseId}:${documentId}:${slug}`;
}
