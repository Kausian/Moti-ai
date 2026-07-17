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
   * A challenge was just answered correctly and its short celebrating window is
   * still open (managed by `useMotiVisualState`).
   */
  celebrationJustEarned?: boolean;
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
 *   1. requestPending        → thinking   (a new/active request always wins)
 *   2. hasError              → error
 *   3. celebrationJustEarned → celebrating
 *   4. answerJustCompleted   → explaining
 *   5. composing             → listening
 *   6. otherwise             → idle
 *
 * `celebrating` sits below thinking and error on purpose: a new request or a
 * failure must interrupt a celebration immediately (Phase 8). It is only ever
 * earned by a validated correct challenge answer — never by chat or teach-back.
 */
export function mapConversationToVisualState(
  signals: ConversationSignals,
): MotiVisualState {
  if (signals.requestPending) return "thinking";
  if (signals.hasError) return "error";
  if (signals.celebrationJustEarned) return "celebrating";
  if (signals.answerJustCompleted) return "explaining";
  if (signals.composing) return "listening";
  return "idle";
}

// ---------------------------------------------------------------------------
// Phase 7 — combining chat and Moti Mirror teach-back signals
// ---------------------------------------------------------------------------

/** Grounded signals from the normal conversation. */
export interface ChatAvatarSignals {
  requestPending: boolean;
  hasError: boolean;
  composing: boolean;
  /** Completed assistant answers; an increase opens the explaining window. */
  answerCount: number;
  hasMessages: boolean;
}

/** Grounded signals from the Moti Mirror activity. */
export interface TeachBackAvatarSignals {
  /** False when no activity is open — teach-back then contributes nothing. */
  active: boolean;
  pending: boolean;
  hasError: boolean;
  /** Completed teach-back evaluations; an increase opens the explaining window. */
  feedbackCount: number;
  /** The learner is drafting their explanation. */
  composing: boolean;
}

/** Grounded signals from the micro-challenge activity (Phase 8). */
export interface ChallengeAvatarSignals {
  /** False when no activity is open — the challenge then contributes nothing. */
  active: boolean;
  /** Generating a challenge or marking an answer. */
  pending: boolean;
  hasError: boolean;
  /** The learner is choosing options, writing, or in setup. */
  answering: boolean;
  /** Completed markings; an increase opens the explaining window. */
  resultCount: number;
  /** Validated correct answers; an increase opens the celebrating window. */
  celebrationCount: number;
}

/** The combined input consumed by `useMotiVisualState`. */
export interface CombinedAvatarSignals {
  requestPending: boolean;
  hasError: boolean;
  composing: boolean;
  answerCount: number;
  celebrationCount: number;
  hasMessages: boolean;
}

const NO_CHALLENGE: ChallengeAvatarSignals = {
  active: false,
  pending: false,
  hasError: false,
  answering: false,
  resultCount: 0,
  celebrationCount: 0,
};

/**
 * Combines conversation, teach-back, and challenge signals into one set for the
 * visual-state mapping, so a single priority order governs all three. An activity
 * only contributes while it is open; closing it returns Moti to the normal
 * conversation-derived state.
 *
 * Because the mapping's priority is
 * thinking > error > celebrating > explaining > listening, a pending request from
 * any activity outranks idle/listening, an error interrupts a celebration, and a
 * normal chat request still drives Moti on its own.
 *
 * Only a validated correct challenge answer increments `celebrationCount`, so a
 * wrong answer can never celebrate. Every marking (right or wrong) increments the
 * shared answer count, so a non-correct result still shows the explaining state.
 */
export function combineAvatarSignals(
  chat: ChatAvatarSignals,
  teachBack: TeachBackAvatarSignals,
  challenge: ChallengeAvatarSignals = NO_CHALLENGE,
): CombinedAvatarSignals {
  const mirrorActive = teachBack.active;
  const challengeActive = challenge.active;
  return {
    requestPending:
      chat.requestPending ||
      (mirrorActive && teachBack.pending) ||
      (challengeActive && challenge.pending),
    hasError:
      chat.hasError ||
      (mirrorActive && teachBack.hasError) ||
      (challengeActive && challenge.hasError),
    composing:
      chat.composing ||
      (mirrorActive && teachBack.composing) ||
      (challengeActive && challenge.answering),
    answerCount:
      chat.answerCount +
      (mirrorActive ? teachBack.feedbackCount : 0) +
      (challengeActive ? challenge.resultCount : 0),
    celebrationCount: challengeActive ? challenge.celebrationCount : 0,
    hasMessages: chat.hasMessages || mirrorActive || challengeActive,
  };
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
