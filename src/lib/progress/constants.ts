// Limits and review intervals for locally persisted learning progress.
//
// The caps are conservative prototype safeguards: localStorage is small and
// shared per-origin, so unbounded history would eventually break saving. When a
// cap is reached the app reports it honestly rather than silently dropping the
// learner's newest work.

export const LEARNING_PROGRESS_STORAGE_KEY = "moti-ai:learning-progress:v1";
export const LEARNING_PROGRESS_VERSION = 1;

export const MAX_CONCEPTS_PER_COURSE = 100;
/** Recent evidence per concept; older entries are trimmed. */
export const MAX_EVIDENCE_PER_CONCEPT = 20;
export const MAX_MEMORY_ECHO_ITEMS_PER_COURSE = 100;
export const MAX_MEMORY_ECHO_PROMPT_LENGTH = 300;
export const MAX_SOURCE_IDS_PER_RECORD = 4;

/**
 * Initial review intervals, in days, by saved mastery.
 *
 * These are **lightweight prototype review heuristics**, not scientifically
 * optimised spaced-repetition intervals: weaker understanding simply comes back
 * sooner. A real system would tune these against evidence.
 */
export const INITIAL_REVIEW_DAYS: Record<
  "exploring" | "developing" | "understood",
  number
> = {
  exploring: 1,
  developing: 2,
  understood: 4,
};

/** How far out "needs more practice" / "review tomorrow" pushes an item. */
export const NEXT_PRACTICE_DAYS = 1;

export const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;
