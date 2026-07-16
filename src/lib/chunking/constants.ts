// Section- and paragraph-aware chunking limits. These are prototype heuristics
// chosen for readable, deterministic chunks over the small local knowledge
// collection — not tuned against a benchmark.

/** Preferred chunk size in characters; splitting aims for this. */
export const TARGET_CHUNK_SIZE = 900;

/** Hard maximum chunk size in characters; a chunk never exceeds this. */
export const MAX_CHUNK_SIZE = 1200;

/** Characters of overlap carried between consecutive chunks of one section. */
export const CHUNK_OVERLAP = 120;

/**
 * A trailing remainder shorter than this is absorbed into the previous chunk
 * (when the combined size still fits under the hard maximum), to avoid tiny
 * fragment chunks.
 */
export const MIN_TRAILING_CHUNK_SIZE = 200;
