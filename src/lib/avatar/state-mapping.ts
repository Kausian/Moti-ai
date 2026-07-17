// Pure, framework-free mapping from conversation behaviour to a MotiVisualState,
// plus the accessible text shown for each state. Kept free of React and three so
// it is fully unit-testable without a WebGL context.

import type { MotiVisualState } from "@/lib/types";

/** Grounded signals derived from the real conversation, in priority order. */
export interface ConversationSignals {
  /** A request to Gemini is in flight. */
  requestPending: boolean;
  /** The conversation currently has an unresolved error. */
  hasError: boolean;
  /**
   * A successful answer has just completed and its short explaining window is
   * still open (managed by `useMotiVisualState`).
   */
  answerJustCompleted: boolean;
  /** The learner is actively composing (composer focused or a non-empty draft). */
  composing: boolean;
}

/**
 * Resolves the conversation signals to a single visual state using a strict
 * priority order — a lower-priority signal never overrides a higher one:
 *
 *   1. requestPending   → thinking   (a new/active request always wins)
 *   2. hasError         → error
 *   3. answerJustCompleted → explaining
 *   4. composing        → listening
 *   5. otherwise        → idle
 *
 * `celebrating` is a valid MotiVisualState but is intentionally not produced
 * here; it is reserved for a later challenge-success phase.
 */
export function mapConversationToVisualState(
  signals: ConversationSignals,
): MotiVisualState {
  if (signals.requestPending) return "thinking";
  if (signals.hasError) return "error";
  if (signals.answerJustCompleted) return "explaining";
  if (signals.composing) return "listening";
  return "idle";
}

/** Every visual state, useful for exhaustive iteration and tests. */
export const VISUAL_STATES: readonly MotiVisualState[] = [
  "idle",
  "listening",
  "thinking",
  "explaining",
  "celebrating",
  "error",
] as const;

interface VisualStateText {
  /** Short status label, e.g. shown as a chip. */
  label: string;
  /** One concise sentence describing what Moti is doing. */
  description: string;
  /** Concise, screen-reader-friendly status announcement. */
  announcement: string;
}

/**
 * Accessible text for each state. The 3D scene is decorative; this text is the
 * real, non-visual representation of Moti's status and lives in normal HTML.
 */
export const VISUAL_STATE_TEXT: Record<MotiVisualState, VisualStateText> = {
  idle: {
    label: "Ready",
    description: "Moti is ready to help you learn.",
    announcement: "Moti is ready.",
  },
  listening: {
    label: "Listening",
    description: "Moti is listening while you write your question.",
    announcement: "Moti is listening.",
  },
  thinking: {
    label: "Thinking",
    description: "Moti is thinking about your question.",
    announcement: "Moti is thinking about your question.",
  },
  explaining: {
    label: "Explaining",
    description: "Moti is explaining the answer.",
    announcement: "Moti is explaining the answer.",
  },
  celebrating: {
    label: "Celebrating",
    description: "Moti is celebrating your progress.",
    announcement: "Moti is celebrating your progress.",
  },
  error: {
    label: "Needs a retry",
    description: "Moti encountered a conversation error.",
    announcement: "Moti encountered a conversation error.",
  },
};
