// Pure text normalization. Collapses noisy whitespace while preserving useful
// paragraph separation, so extracted text stays readable.

export function normalizeExtractedText(raw: string): string {
  return (
    raw
      // Normalize newlines.
      .replace(/\r\n?/g, "\n")
      // Drop zero-width and other invisible formatting characters.
      .replace(/[​-‍﻿]/g, "")
      // Trim trailing spaces/tabs on each line.
      .replace(/[ \t]+\n/g, "\n")
      // Collapse runs of spaces/tabs into a single space.
      .replace(/[ \t]{2,}/g, " ")
      // Collapse 3+ blank lines into a single paragraph break.
      .replace(/\n{3,}/g, "\n\n")
      .trim()
  );
}

/** True when text has no meaningful content after normalization. */
export function isEffectivelyEmpty(text: string): boolean {
  return text.replace(/\s/g, "").length === 0;
}
