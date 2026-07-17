// Server-side validation limits for the /api/chat request. All client input is
// untrusted; these caps bound request size before Gemini is ever called.

export const MAX_MESSAGE_LENGTH = 300;
export const MAX_HISTORY_ITEMS = 6;
export const MAX_HISTORY_ITEM_LENGTH = 1200;
export const MAX_COURSE_TITLE_LENGTH = 150;
export const MAX_OBJECTIVE_LENGTH = 1000;
/**
 * Phase 3 did not enforce an explicit assistant-instructions limit; Phase 5
 * establishes one for the server prompt. Documented in the README/docs.
 */
export const MAX_ASSISTANT_INSTRUCTIONS_LENGTH = 2000;
export const MAX_SOURCES = 4;
export const MAX_SOURCE_CONTENT_LENGTH = 1500;
export const MAX_TOTAL_SOURCE_CONTEXT = 6000;

export const LEARNER_LEVELS = ["beginner", "intermediate", "advanced"] as const;
