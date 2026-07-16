// Retrieval + ranking heuristics. These weights are prototype heuristics chosen
// for transparent, deterministic ranking over a small local collection. They are
// NOT tuned against a benchmark and do not represent a scientifically optimized
// configuration.

/** BM25 term-frequency saturation. Standard-ish default. */
export const BM25_K1 = 1.5;
/** BM25 length-normalization strength (0 = none, 1 = full). */
export const BM25_B = 0.75;

/** Added once per distinct query term found in the document title. */
export const TITLE_BOOST_WEIGHT = 1.5;
/** Added once per distinct query term found in the section heading. */
export const HEADING_BOOST_WEIGHT = 2.5;
/** Added when the whole query phrase appears verbatim in the chunk. */
export const PHRASE_BOOST_WEIGHT = 3;
/** Multiplied by the fraction of query terms a chunk matches. */
export const COVERAGE_BOOST_WEIGHT = 2;

/** Questions longer than this are rejected by the UI (and truncated defensively). */
export const MAX_QUERY_LENGTH = 300;
/** Default maximum number of results returned. */
export const MAX_RESULTS = 4;
/** Target length of the plain-text excerpt shown for each result. */
export const EXCERPT_LENGTH = 240;
