// Builds the in-memory lexical index from the active documents. The index is
// always derived from stored documents and is never itself persisted.

import type {
  IndexedKnowledgeChunk,
  KnowledgeChunk,
  KnowledgeDocument,
  KnowledgeIndex,
} from "@/lib/types";
import { buildChunks } from "@/lib/chunking/build-chunks";
import { normalizeForMatching, tokenizeContent } from "./tokenize";

function indexChunk(chunk: KnowledgeChunk): IndexedKnowledgeChunk {
  const terms = tokenizeContent(chunk.content);
  const termFrequencies: Record<string, number> = {};
  for (const term of terms) {
    termFrequencies[term] = (termFrequencies[term] ?? 0) + 1;
  }
  // Collapsed to single-spaced alphanumerics so an exact query phrase can be
  // matched on word boundaries regardless of the original punctuation.
  const searchableText = normalizeForMatching(
    `${chunk.documentTitle} ${chunk.sectionHeading ?? ""} ${chunk.content}`,
  )
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
  return { ...chunk, searchableText, terms, termFrequencies, length: terms.length };
}

export function buildIndex(documents: KnowledgeDocument[]): KnowledgeIndex {
  const chunks = buildChunks(documents).map(indexChunk);

  const documentFrequencies: Record<string, number> = {};
  let totalTerms = 0;
  let totalIndexedCharacters = 0;
  for (const chunk of chunks) {
    totalTerms += chunk.length;
    totalIndexedCharacters += chunk.characterCount;
    for (const term of Object.keys(chunk.termFrequencies)) {
      documentFrequencies[term] = (documentFrequencies[term] ?? 0) + 1;
    }
  }

  const chunkCount = chunks.length;
  return {
    chunks,
    documentFrequencies,
    averageTermCount: chunkCount > 0 ? totalTerms / chunkCount : 0,
    stats: {
      documentCount: documents.length,
      chunkCount,
      totalIndexedCharacters,
      averageChunkLength:
        chunkCount > 0 ? Math.round(totalIndexedCharacters / chunkCount) : 0,
    },
  };
}
