// The Moti Mirror activity state as a pure reducer, plus the pure derivation of
// the Moti Learning Loop stage. Keeping this framework-free means every rule
// (stage transitions, retry preserving the explanation, close resetting the
// activity) is unit-testable without React Testing Library or a browser.
//
// This state is intentionally separate from the conversation: Moti Mirror data
// never enters `ConversationMessage[]`, so it can never be sent to /api/chat as
// history.

import type {
  ChatErrorPayload,
  ConversationSource,
  MotiLearningLoopStage,
  MotiMirrorStructuredResponse,
} from "@/lib/types";

export interface MirrorActivity {
  /** The grounded answer this activity belongs to. Only one may be active. */
  messageId: string;
  conceptTitle: string;
  /** The validated sources attached to that answer — the only material sent. */
  sources: ConversationSource[];
  learnerExplanation: string;
  pending: boolean;
  feedback: MotiMirrorStructuredResponse | null;
  /**
   * Identifies the current feedback for idempotent saving (Phase 9). Minted once
   * per *successful* evaluation, so retrying a failed request never mints a
   * duplicate, while a genuinely new evaluation gets a new id.
   */
  feedbackActivityId: string | null;
  error: ChatErrorPayload | null;
}

/** `null` means no activity is open. */
export type MirrorState = MirrorActivity | null;

export type MirrorAction =
  | {
      type: "open";
      messageId: string;
      conceptTitle: string;
      sources: ConversationSource[];
    }
  | { type: "draft"; learnerExplanation: string }
  | { type: "submit" }
  | {
      type: "success";
      feedback: MotiMirrorStructuredResponse;
      /** Supplied by the hook so the reducer stays pure. */
      activityId: string;
    }
  | { type: "failure"; error: ChatErrorPayload }
  | { type: "cancel" }
  | { type: "edit" }
  | { type: "close" };

export const initialMirrorState: MirrorState = null;

export function mirrorReducer(state: MirrorState, action: MirrorAction): MirrorState {
  // Opening and closing are the only actions valid without an open activity.
  if (action.type === "open") {
    return {
      messageId: action.messageId,
      conceptTitle: action.conceptTitle,
      sources: action.sources,
      learnerExplanation: "",
      pending: false,
      feedback: null,
      feedbackActivityId: null,
      error: null,
    };
  }
  if (action.type === "close") return null;
  if (state === null) return state;

  switch (action.type) {
    case "draft":
      return { ...state, learnerExplanation: action.learnerExplanation };
    case "submit":
      // A new attempt clears the previous outcome but keeps the explanation.
      return {
        ...state,
        pending: true,
        error: null,
        feedback: null,
        feedbackActivityId: null,
      };
    case "success":
      return {
        ...state,
        pending: false,
        feedback: action.feedback,
        feedbackActivityId: action.activityId,
        error: null,
      };
    case "failure":
      // The learner's explanation is always preserved so they can retry.
      return {
        ...state,
        pending: false,
        error: action.error,
        feedback: null,
        feedbackActivityId: null,
      };
    case "cancel":
      // Cancelling leaves no error and no feedback — just the explanation.
      return { ...state, pending: false };
    case "edit":
      // Return to the composer to revise the explanation.
      return { ...state, feedback: null, feedbackActivityId: null, error: null };
    default:
      return state;
  }
}

/**
 * Derives the Moti Learning Loop stage from the real activity state.
 *
 * think    — the activity just opened; Moti has asked the learner to consider it
 * explain  — the learner is writing their explanation
 * correct  — the explanation is being evaluated (or evaluation failed; retry)
 * remember — feedback is shown together with a Memory Echo recall prompt
 *
 * `remember` requires the recall prompt: without one there is nothing to
 * remember yet, so the loop honestly stays at `correct`.
 */
export function deriveLoopStage(
  state: MirrorState,
  options: { composerFocused: boolean } = { composerFocused: false },
): MotiLearningLoopStage {
  if (state === null) return "think";
  if (state.feedback) {
    return state.feedback.memoryEchoPrompt ? "remember" : "correct";
  }
  if (state.pending || state.error) return "correct";
  if (state.learnerExplanation.trim().length > 0 || options.composerFocused) {
    return "explain";
  }
  return "think";
}

/** True while the learner is actively drafting (drives Moti's listening state). */
export function isDrafting(
  state: MirrorState,
  options: { composerFocused: boolean } = { composerFocused: false },
): boolean {
  if (state === null) return false;
  if (state.pending || state.feedback) return false;
  return state.learnerExplanation.trim().length > 0 || options.composerFocused;
}
