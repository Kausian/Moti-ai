// Deterministic retrieval over the in-memory index. Validates and normalizes the
// question, scores every chunk, ranks with stable tie-breaking, and returns at
// most `MAX_RESULTS` — never padding with irrelevant chunks. Original knowledge
// content is never modified.

import type {
  IndexedKnowledgeChunk,
  KnowledgeChunk,
  KnowledgeIndex,
  KnowledgeRetrievalResponse,
  KnowledgeRetrievalResult,
} from "@/lib/types";
import { EXCERPT_LENGTH, MAX_QUERY_LENGTH, MAX_RESULTS } from "./constants";
import { meaningfulQueryTerms, normalizeForMatching } from "./tokenize";
import { scoreChunk } from "./score-chunk";

export interface RetrieveOptions {
  maxResults?: number;
}

/** Returns a plain KnowledgeChunk without the index-only derived fields. */
function toPlainChunk(chunk: IndexedKnowledgeChunk): KnowledgeChunk {
  return {
    id: chunk.id,
    documentId: chunk.documentId,
    documentTitle: chunk.documentTitle,
    documentType: chunk.documentType,
    chunkIndex: chunk.chunkIndex,
    sectionHeading: chunk.sectionHeading,
    content: chunk.content,
    characterStart: chunk.characterStart,
    characterEnd: chunk.characterEnd,
    characterCount: chunk.characterCount,
  };
}

function buildExcerpt(content: string, matchedTerms: string[]): string {
  if (content.length <= EXCERPT_LENGTH) return content;

  const lower = normalizeForMatching(content);
  let anchor = -1;
  for (const term of matchedTerms) {
    const index = lower.indexOf(term);
    if (index >= 0) {
      anchor = index;
      break;
    }
  }

  if (anchor < 0) return `${content.slice(0, EXCERPT_LENGTH).trimEnd()}…`;

  const half = Math.floor(EXCERPT_LENGTH / 2);
  let end = Math.min(content.length, anchor + half);
  let start = Math.max(0, end - EXCERPT_LENGTH);
  end = Math.min(content.length, start + EXCERPT_LENGTH);
  // Snap outward to whitespace so words are not cut.
  while (start > 0 && !/\s/.test(content[start - 1])) start -= 1;
  while (end < content.length && !/\s/.test(content[end])) end += 1;

  const prefix = start > 0 ? "…" : "";
  const suffix = end < content.length ? "…" : "";
  return `${prefix}${content.slice(start, end).trim()}${suffix}`;
}

/** Deterministic order: score desc, then title, then chunk index. */
function compareResults(
  a: { total: number; chunk: IndexedKnowledgeChunk },
  b: { total: number; chunk: IndexedKnowledgeChunk },
): number {
  if (b.total !== a.total) return b.total - a.total;
  if (a.chunk.documentTitle < b.chunk.documentTitle) return -1;
  if (a.chunk.documentTitle > b.chunk.documentTitle) return 1;
  return a.chunk.chunkIndex - b.chunk.chunkIndex;
}

export function retrieveKnowledge(
  index: KnowledgeIndex,
  rawQuery: string,
  options: RetrieveOptions = {},
): KnowledgeRetrievalResponse {
  const query = (rawQuery ?? "").slice(0, MAX_QUERY_LENGTH).trim();
  const terms = meaningfulQueryTerms(query);

  if (terms.length === 0 || index.chunks.length === 0) {
    return { query, meaningfulQueryTerms: terms, results: [], hasRelevantKnowledge: false };
  }

  const queryPhrase = normalizeForMatching(query)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  const limit = Math.max(1, options.maxResults ?? MAX_RESULTS);

  const scored = index.chunks
    .map((chunk) => {
      const { breakdown, matchedTerms } = scoreChunk(chunk, terms, queryPhrase, index);
      return { chunk, breakdown, matchedTerms, total: breakdown.total };
    })
    .filter((entry) => entry.matchedTerms.length > 0 && entry.total > 0);

  scored.sort(compareResults);

  const results: KnowledgeRetrievalResult[] = scored.slice(0, limit).map((entry) => ({
    chunk: toPlainChunk(entry.chunk),
    score: entry.total,
    matchedTerms: entry.matchedTerms,
    scoreBreakdown: entry.breakdown,
    excerpt: buildExcerpt(entry.chunk.content, entry.matchedTerms),
  }));

  return {
    query,
    meaningfulQueryTerms: terms,
    results,
    hasRelevantKnowledge: results.length > 0,
  };
}
