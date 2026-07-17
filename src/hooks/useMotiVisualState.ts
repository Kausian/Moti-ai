"use client";

import { useEffect, useState } from "react";
import type { MotiVisualState } from "@/lib/types";
import {
  mapConversationToVisualState,
  type ConversationSignals,
} from "@/lib/avatar/state-mapping";
import { EXPLAINING_DURATION_MS } from "@/lib/avatar/constants";

export interface UseMotiVisualStateInput {
  /** A request to Gemini is in flight. */
  requestPending: boolean;
  /** The conversation has an unresolved error. */
  hasError: boolean;
  /** The learner is composing (composer focused or a non-empty draft). */
  composing: boolean;
  /** Count of completed assistant answers — an increase marks a new answer. */
  answerCount: number;
  /** Whether the conversation currently holds any messages. */
  hasMessages: boolean;
}

/**
 * Resolves conversation behaviour to a live MotiVisualState.
 *
 * The pure priority mapping lives in `state-mapping`; this hook adds the only
 * stateful piece: a short, self-clearing "explaining" window opened when a
 * request settles successfully with a new answer.
 *
 * The transition is detected during render (the "adjust state when inputs
 * change" pattern) so no synchronous state is set inside an effect, and no
 * impure clock is read during render. A single effect schedules the timeout that
 * closes the window; its only state update runs inside the timer callback, and a
 * generation counter reschedules it for back-to-back answers. Higher-priority
 * states pre-empt explaining for free: `requestPending` and `hasError` win in the
 * pure mapping, and clearing the conversation (`hasMessages` false) is treated as
 * not-explaining — so Moti never gets stuck, including after a cancellation
 * (no error, no new answer).
 */
export function useMotiVisualState(
  input: UseMotiVisualStateInput,
): MotiVisualState {
  const { requestPending, hasError, composing, answerCount, hasMessages } = input;

  const [explaining, setExplaining] = useState(false);
  const [explainingGeneration, setExplainingGeneration] = useState(0);
  const [prev, setPrev] = useState({ requestPending, answerCount });

  if (prev.requestPending !== requestPending || prev.answerCount !== answerCount) {
    const answerJustCompleted =
      prev.requestPending &&
      !requestPending &&
      answerCount > prev.answerCount &&
      !hasError;
    setPrev({ requestPending, answerCount });
    if (answerJustCompleted) {
      setExplaining(true);
      setExplainingGeneration((generation) => generation + 1);
    } else {
      // Any other transition (a new request starting, a clear) closes the window.
      setExplaining(false);
    }
  }

  useEffect(() => {
    if (!explaining) return;
    const id = setTimeout(() => setExplaining(false), EXPLAINING_DURATION_MS);
    return () => clearTimeout(id);
  }, [explaining, explainingGeneration]);

  const signals: ConversationSignals = {
    requestPending,
    hasError,
    // A cleared conversation drops any lingering explaining window immediately.
    answerJustCompleted: explaining && hasMessages,
    composing,
  };
  return mapConversationToVisualState(signals);
}
