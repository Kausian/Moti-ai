// Prototype safeguards for knowledge ingestion. These are Moti AI limits for
// this prototype — NOT universal browser limitations — and are shown in the UI.

import type { SupportedDocumentType } from "@/lib/types";

export const MAX_DOCUMENTS = 5;
export const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB
export const MAX_EXTRACTED_CHARACTERS = 500_000; // per individual document
export const MAX_TOTAL_EXTRACTED_CHARACTERS = 1_000_000; // across all documents

/** Accepted upload extensions (lowercase, with leading dot). */
export const ACCEPTED_EXTENSIONS = [".pdf", ".txt", ".md", ".markdown"] as const;

/**
 * MIME types we accept when the browser provides one. Kept permissive because
 * browsers report Markdown/plain text inconsistently; the extension is the
 * primary signal and this list is a secondary check.
 */
export const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "text/plain",
  "text/markdown",
  "text/x-markdown",
  "text/x-web-markdown",
  "", // some browsers report an empty type for .md/.txt
] as const;

/** The `accept` attribute value for the native file input. */
export const FILE_INPUT_ACCEPT = [
  ...ACCEPTED_EXTENSIONS,
  "application/pdf",
  "text/plain",
  "text/markdown",
].join(",");

/** Maps a resolved document type to a short human label. */
export const DOCUMENT_TYPE_LABEL: Record<SupportedDocumentType, string> = {
  pdf: "PDF",
  txt: "TXT",
  markdown: "Markdown",
  "plain-text": "Text",
};
