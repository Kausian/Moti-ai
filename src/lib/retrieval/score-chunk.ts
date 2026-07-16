// Transparent per-chunk scoring: a BM25-inspired content score plus four small,
// documented boosts. Every value is guarded to stay finite.

import type {
  IndexedKnowledgeChunk,
  KnowledgeIndex,
  RetrievalScoreBreakdown,
} from "@/lib/types";
import {
  BM25_B,
  BM25_K1,
  COVERAGE_BOOST_WEIGHT,
  HEADING_BOOST_WEIGHT,
  PHRASE_BOOST_WEIGHT,
  TITLE_BOOST_WEIGHT,
} from "./constants";
import { extractTokens } from "./tokenize";

export interface ChunkScore {
  breakdown: RetrievalScoreBreakdown;
  matchedTerms: string[];
}

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** BM25 inverse document frequency, smoothed so it stays positive. */
function inverseDocumentFrequency(
  documentFrequency: number,
  totalChunks: number,
): number {
  const numerator = totalChunks - documentFrequency + 0.5;
  const denominator = documentFrequency + 0.5;
  return Math.log(1 + numerator / denominator);
}

export function scoreChunk(
  chunk: IndexedKnowledgeChunk,
  queryTerms: string[],
  queryPhrase: string,
  index: KnowledgeIndex,
): ChunkScore {
  const totalChunks = index.chunks.length;
  const averageLength = index.averageTermCount || 1;

  const titleTerms = new Set(extractTokens(chunk.documentTitle));
  const headingTerms = new Set(extractTokens(chunk.sectionHeading ?? ""));

  const matchedTerms: string[] = [];
  let contentScore = 0;
  let titleBoost = 0;
  let headingBoost = 0;

  for (const term of queryTerms) {
    const termFrequency = chunk.termFrequencies[term] ?? 0;
    const inTitle = titleTerms.has(term);
    const inHeading = headingTerms.has(term);

    if (termFrequency > 0 || inTitle || inHeading) {
      matchedTerms.push(term);
    }

    if (termFrequency > 0) {
      const df = index.documentFrequencies[term] ?? 0;
      const idf = inverseDocumentFrequency(df, totalChunks);
      const denominator =
        termFrequency + BM25_K1 * (1 - BM25_B + BM25_B * (chunk.length / averageLength));
      contentScore += idf * ((termFrequency * (BM25_K1 + 1)) / (denominator || 1));
    }
    if (inTitle) titleBoost += TITLE_BOOST_WEIGHT;
    if (inHeading) headingBoost += HEADING_BOOST_WEIGHT;
  }

  // Exact phrase: the whole (multi-term) query appears verbatim, on word
  // boundaries, in the chunk's searchable text.
  let phraseBoost = 0;
  if (
    queryTerms.length > 1 &&
    queryPhrase.length > 0 &&
    ` ${chunk.searchableText} `.includes(` ${queryPhrase} `)
  ) {
    phraseBoost = PHRASE_BOOST_WEIGHT;
  }

  // Coverage: reward chunks that match a larger share of the query's terms.
  const coverageBoost =
    queryTerms.length > 0
      ? (matchedTerms.length / queryTerms.length) * COVERAGE_BOOST_WEIGHT
      : 0;

  contentScore = finite(contentScore);
  titleBoost = finite(titleBoost);
  headingBoost = finite(headingBoost);
  phraseBoost = finite(phraseBoost);
  const coverage = finite(coverageBoost);
  const total = finite(
    contentScore + titleBoost + headingBoost + phraseBoost + coverage,
  );

  return {
    breakdown: {
      contentScore,
      titleBoost,
      headingBoost,
      phraseBoost,
      coverageBoost: coverage,
      total,
    },
    matchedTerms,
  };
}
