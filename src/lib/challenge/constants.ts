// Server-side limits for the challenge generation/evaluation routes and for the
// model's structured output. All client input is untrusted; these caps bound the
// request before Gemini is called, and bound the response before it reaches the
// UI. Source caps intentionally mirror the chat and teach-back routes so a
// challenge never sends more context than a normal grounded answer.

import type { MotiChallengeDifficulty, MotiChallengeType } from "@/lib/types";

export const CHALLENGE_TYPES: readonly MotiChallengeType[] = [
  "multiple-choice",
  "scenario",
  "correct-the-mistake",
  "explain-in-own-words",
];

export const CHALLENGE_DIFFICULTIES: readonly MotiChallengeDifficulty[] = [
  "beginner",
  "intermediate",
  "advanced",
];

/** Choice challenges always present exactly four options — never more or fewer. */
export const CHOICE_OPTION_COUNT = 4;

/**
 * A learner gets two attempts at one generated challenge: the first failure earns
 * a targeted hint and a retry, the second reveals the full grounded explanation.
 * There are no unlimited automatic retries.
 */
export const MAX_CHALLENGE_ATTEMPTS = 2;

export const MAX_CHALLENGE_CONCEPT_LENGTH = 150;

/** Free-response answers: enough to be meaningful, bounded to stay cheap. */
export const MIN_WRITTEN_ANSWER_LENGTH = 5;
export const MAX_WRITTEN_ANSWER_LENGTH = 1200;

/** At least one source is required — a challenge is never generated ungrounded. */
export const MIN_CHALLENGE_SOURCES = 1;

// ---------------------------------------------------------------------------
// Generated-challenge limits
// ---------------------------------------------------------------------------

export const MAX_CHALLENGE_PROMPT_LENGTH = 600;
export const MAX_CHALLENGE_INSTRUCTIONS_LENGTH = 300;
export const MAX_CHALLENGE_OPTION_LENGTH = 250;
export const MAX_CHALLENGE_HINT_LENGTH = 300;
export const MAX_REFERENCE_EXPLANATION_LENGTH = 1000;
export const MAX_REFERENCE_ANSWER_LENGTH = 1000;
export const MAX_ESSENTIAL_POINTS = 5;
export const MAX_ESSENTIAL_POINT_LENGTH = 250;
export const MAX_CHALLENGE_USED_SOURCE_IDS = 4;

// ---------------------------------------------------------------------------
// Evaluation limits
// ---------------------------------------------------------------------------

export const MAX_CHALLENGE_FEEDBACK_LENGTH = 500;
export const MAX_CHALLENGE_LIST_ITEMS = 3;
export const MAX_CHALLENGE_LIST_ITEM_LENGTH = 250;
export const MAX_CHALLENGE_CORRECTION_LENGTH = 500;
export const MAX_CHALLENGE_EXPLANATION_LENGTH = 1000;
export const MAX_CHALLENGE_MEMORY_ECHO_LENGTH = 300;

/** A generated challenge carries several fields plus four options. */
export const MAX_CHALLENGE_GENERATION_TOKENS = 1400;
/** An evaluation is smaller than a full teach-back coaching payload. */
export const MAX_CHALLENGE_EVALUATION_TOKENS = 1000;
