// Pure tokenization for documents and queries. No stemming and no NLP
// dependency — tokens are compared literally. Input text is never mutated.

import { isStopWord } from "./stop-words";

/** Lowercases and strips diacritics (é → e) for consistent literal matching. */
export function normalizeForMatching(text: string): string {
  return text.normalize("NFKD").replace(/\p{M}+/gu, "").toLowerCase();
}

/**
 * Extracts runs of letters/numbers. Punctuation and symbols are dropped;
 * numbers and technical terms survive (e.g. "GPT-4" → ["gpt", "4"]).
 */
export function extractTokens(text: string): string[] {
  if (!text) return [];
  const matches = normalizeForMatching(text).match(/[a-z0-9]+/g);
  return matches ?? [];
}

/** Content tokens for indexing: all meaningful (non-stop-word) tokens. */
export function tokenizeContent(text: string): string[] {
  return extractTokens(text).filter((token) => !isStopWord(token));
}

/**
 * Meaningful query terms: tokenized, stop words removed, and de-duplicated so a
 * repeated word is not counted more than once. Order is preserved.
 */
export function meaningfulQueryTerms(query: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const token of extractTokens(query)) {
    if (isStopWord(token) || seen.has(token)) continue;
    seen.add(token);
    terms.push(token);
  }
  return terms;
}
