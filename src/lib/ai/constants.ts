// Server-side AI configuration. Conservative settings suited to grounded,
// low-latency educational answers. Read the model from the environment with a
// safe fallback to a documented stable Flash model.

/**
 * Confirmed default model, verified working against the real Gemini API for this
 * project. (gemini-3.5-flash returned HTTP 503 for this project during testing.)
 * Overridable via the GEMINI_MODEL server environment variable.
 */
export const DEFAULT_GEMINI_MODEL = "gemini-3.1-flash-lite";

/** Low temperature keeps grounded answers predictable. */
export const GENERATION_TEMPERATURE = 0.2;
export const MAX_OUTPUT_TOKENS = 800;
export const CANDIDATE_COUNT = 1;

/** Hard server timeout for a single generation. */
export const REQUEST_TIMEOUT_MS = 45_000;

/** Runtime bounds applied to the model's returned JSON. */
export const MAX_ANSWER_LENGTH = 1500;
export const MAX_USED_SOURCE_IDS = 4;
export const MAX_SUGGESTED_ACTIONS = 3;
export const MAX_FOLLOW_UP_LENGTH = 300;
