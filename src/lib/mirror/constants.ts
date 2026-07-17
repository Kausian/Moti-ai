// Server-side validation limits for the /api/teach-back request and for the
// model's structured feedback. All client input is untrusted; these caps bound
// the request before Gemini is ever called, and bound the response before it
// reaches the UI. Source caps intentionally mirror the chat route so a
// teach-back never sends more context than a normal grounded answer.

export const MAX_CONCEPT_TITLE_LENGTH = 150;

/** A meaningful explanation needs some substance; below this we do not evaluate. */
export const MIN_EXPLANATION_LENGTH = 15;
export const MAX_EXPLANATION_LENGTH = 1200;

/** At least one source is required — teach-back never runs ungrounded. */
export const MIN_TEACH_BACK_SOURCES = 1;

// ---------------------------------------------------------------------------
// Structured-response limits
// ---------------------------------------------------------------------------

export const MAX_FEEDBACK_SUMMARY_LENGTH = 500;
export const MAX_CORRECT_UNDERSTANDING_ITEMS = 3;
export const MAX_MISSING_POINT_ITEMS = 3;
export const MAX_MISCONCEPTIONS = 3;
/** Applies to each correct-understanding / missing-point list item. */
export const MAX_LIST_ITEM_LENGTH = 250;
/** Applies to each misconception field (learnerIdea, correction). */
export const MAX_MISCONCEPTION_FIELD_LENGTH = 250;
export const MAX_IMPROVED_EXPLANATION_LENGTH = 1200;
export const MAX_MASTERY_RATIONALE_LENGTH = 400;
export const MAX_MIRROR_USED_SOURCE_IDS = 4;
export const MAX_MEMORY_ECHO_PROMPT_LENGTH = 300;

/**
 * Teach-back feedback is structurally larger than a chat answer (several lists
 * plus an improved explanation), so it needs a higher output budget than
 * `MAX_OUTPUT_TOKENS` in lib/ai/constants.
 */
export const MAX_MIRROR_OUTPUT_TOKENS = 1400;
