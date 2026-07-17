// The micro-challenge activity state as a pure reducer. Keeping it framework-free
// means every rule (stage transitions, retry preserving the challenge, close
// resetting the activity, attempt counting) is unit-testable without React
// Testing Library or a browser.
//
// This state is intentionally separate from the conversation and from Moti
// Mirror: challenge data never enters `ConversationMessage[]`, so it can never be
// sent to /api/chat as history, and it is never persisted.

import type {
  ChallengeEvaluationResult,
  ChatErrorPayload,
  ConversationSource,
  GeneratedMotiChallenge,
  MotiChallengeDifficulty,
  MotiChallengeType,
} from "@/lib/types";
import { MAX_CHALLENGE_ATTEMPTS } from "./constants";

export type MotiChallengeStage =
  | "setup"
  | "generating"
  | "answering"
  | "evaluating"
  | "feedback"
  | "complete";

export interface ChallengeActivity {
  /** The grounded answer this activity belongs to. Only one may be active. */
  messageId: string;
  conceptTitle: string;
  /** The validated sources attached to that answer — the only material sent. */
  sources: ConversationSource[];
  requestedType: MotiChallengeType | "auto";
  difficulty: MotiChallengeDifficulty;
  challenge: GeneratedMotiChallenge | null;
  /** The learner's current answer (option id or free text). */
  selectedOptionId: string | null;
  writtenAnswer: string;
  /** Completed attempts against the current challenge. */
  attempts: number;
  pending: boolean;
  result: ChallengeEvaluationResult | null;
  error: ChatErrorPayload | null;
  /** True once the learner chose to reveal the answer, ending the challenge. */
  revealed: boolean;
}

/** `null` means no activity is open. */
export type ChallengeState = ChallengeActivity | null;

export type ChallengeAction =
  | {
      type: "open";
      messageId: string;
      conceptTitle: string;
      sources: ConversationSource[];
      difficulty: MotiChallengeDifficulty;
    }
  | { type: "set-type"; requestedType: MotiChallengeType | "auto" }
  | { type: "set-difficulty"; difficulty: MotiChallengeDifficulty }
  | { type: "generate" }
  | { type: "generated"; challenge: GeneratedMotiChallenge }
  | { type: "select-option"; optionId: string }
  | { type: "write"; writtenAnswer: string }
  | { type: "submit" }
  | { type: "evaluated"; result: ChallengeEvaluationResult }
  | { type: "failure"; error: ChatErrorPayload }
  | { type: "cancel" }
  | { type: "retry" }
  | { type: "reveal" }
  | { type: "close" };

export const initialChallengeState: ChallengeState = null;

export function challengeReducer(
  state: ChallengeState,
  action: ChallengeAction,
): ChallengeState {
  // Opening and closing are the only actions valid without an open activity.
  if (action.type === "open") {
    return {
      messageId: action.messageId,
      conceptTitle: action.conceptTitle,
      sources: action.sources,
      requestedType: "auto",
      difficulty: action.difficulty,
      challenge: null,
      selectedOptionId: null,
      writtenAnswer: "",
      attempts: 0,
      pending: false,
      result: null,
      error: null,
      revealed: false,
    };
  }
  if (action.type === "close") return null;
  if (state === null) return state;

  switch (action.type) {
    case "set-type":
      return { ...state, requestedType: action.requestedType };
    case "set-difficulty":
      return { ...state, difficulty: action.difficulty };
    case "generate":
      return { ...state, pending: true, error: null };
    case "generated":
      // A fresh challenge resets the attempt history and any previous answer.
      return {
        ...state,
        pending: false,
        challenge: action.challenge,
        selectedOptionId: null,
        writtenAnswer: "",
        attempts: 0,
        result: null,
        error: null,
        revealed: false,
      };
    case "select-option":
      return { ...state, selectedOptionId: action.optionId };
    case "write":
      return { ...state, writtenAnswer: action.writtenAnswer };
    case "submit":
      return { ...state, pending: true, error: null };
    case "evaluated":
      // The attempt only counts once it has actually been marked.
      return {
        ...state,
        pending: false,
        result: action.result,
        error: null,
        attempts: state.attempts + 1,
      };
    case "failure":
      // The challenge and the learner's answer are always preserved for a retry.
      return { ...state, pending: false, error: action.error };
    case "cancel":
      // Cancelling leaves no error and no result — just the current answer.
      return { ...state, pending: false };
    case "retry":
      // Return to the challenge to answer again; the challenge itself is kept.
      return { ...state, result: null, error: null };
    case "reveal":
      // Revealing ends the challenge without a correct completion.
      return { ...state, revealed: true, error: null };
    default:
      return state;
  }
}

/** Attempts left against the current challenge. */
export function attemptsRemaining(state: ChallengeState): number {
  if (state === null) return 0;
  return Math.max(0, MAX_CHALLENGE_ATTEMPTS - state.attempts);
}

/**
 * True when the learner may answer again: the previous attempt was not correct,
 * attempts remain, and they have not revealed the answer.
 */
export function canRetry(state: ChallengeState): boolean {
  if (state === null || state.challenge === null || state.revealed) return false;
  if (state.result === null) return false;
  return state.result.outcome !== "correct" && attemptsRemaining(state) > 0;
}

/** Derives the activity stage from the real state. */
export function deriveChallengeStage(state: ChallengeState): MotiChallengeStage {
  if (state === null) return "setup";
  if (state.challenge === null) return state.pending ? "generating" : "setup";
  if (state.pending) return "evaluating";
  if (state.revealed) return "complete";
  if (state.result) {
    // A correct answer, or a failure with no attempts left, ends the challenge.
    if (state.result.outcome === "correct" || attemptsRemaining(state) === 0) {
      return "complete";
    }
    return "feedback";
  }
  return "answering";
}

/**
 * True while the learner is working on an answer (drives Moti's listening state).
 * Setup also counts: Moti is waiting on the learner, not thinking.
 */
export function isAnswering(state: ChallengeState): boolean {
  if (state === null || state.pending) return false;
  if (state.result !== null || state.revealed) return false;
  return true;
}
