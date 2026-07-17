"use client";

import { useEffect, useState } from "react";
import type { MotiVisualState } from "@/lib/types";
import {
  mapConversationToVisualState,
  type ConversationSignals,
} from "@/lib/avatar/state-mapping";
import {
  CELEBRATING_DURATION_MS,
  EXPLAINING_DURATION_MS,
} from "@/lib/avatar/constants";

export interface UseMotiVisualStateInput {
  /** A request to Gemini is in flight. */
  requestPending: boolean;
  /** The conversation has an unresolved error. */
  hasError: boolean;
  /** The learner is composing (composer focused or a non-empty draft). */
  composing: boolean;
  /** Count of completed results — an increase opens the explaining window. */
  answerCount: number;
  /** Count of validated correct challenges — an increase opens celebrating. */
  celebrationCount?: number;
  /** Whether any activity or conversation content currently exists. */
  hasMessages: boolean;
}

/**
 * Resolves conversation, teach-back, and challenge behaviour to a live
 * MotiVisualState.
 *
 * The pure priority mapping lives in `state-mapping`; this hook adds the only
 * stateful pieces: two short, self-clearing windows — "explaining" when a result
 * lands, and "celebrating" when a challenge is answered correctly.
 *
 * Transitions are detected during render (the "adjust state when inputs change"
 * pattern) so no synchronous state is set inside an effect, and no impure clock
 * is read during render. The windows open purely on a count increasing, which
 * matters because a choice challenge is marked deterministically with no request
 * at all. Each window's timeout only sets state inside its timer callback, and a
 * generation counter reschedules it for back-to-back results.
 *
 * Higher-priority states pre-empt both windows for free: `requestPending` and
 * `hasError` win in the pure mapping, and any non-result transition closes the
 * windows — so a new request or an error interrupts a celebration immediately and
 * Moti never gets stuck.
 */
export function useMotiVisualState(
  input: UseMotiVisualStateInput,
): MotiVisualState {
  const {
    requestPending,
    hasError,
    composing,
    answerCount,
    celebrationCount = 0,
    hasMessages,
  } = input;

  const [explaining, setExplaining] = useState(false);
  const [explainingGeneration, setExplainingGeneration] = useState(0);
  const [celebrating, setCelebrating] = useState(false);
  const [celebratingGeneration, setCelebratingGeneration] = useState(0);
  const [prev, setPrev] = useState({ requestPending, answerCount, celebrationCount });

  if (
    prev.requestPending !== requestPending ||
    prev.answerCount !== answerCount ||
    prev.celebrationCount !== celebrationCount
  ) {
    const answerJustCompleted = answerCount > prev.answerCount && !hasError;
    const celebrationJustEarned = celebrationCount > prev.celebrationCount && !hasError;
    setPrev({ requestPending, answerCount, celebrationCount });

    if (answerJustCompleted) {
      setExplaining(true);
      setExplainingGeneration((generation) => generation + 1);
    } else {
      // Any other transition (a new request starting, a clear) closes the window.
      setExplaining(false);
    }

    if (celebrationJustEarned) {
      setCelebrating(true);
      setCelebratingGeneration((generation) => generation + 1);
    } else {
      setCelebrating(false);
    }
  }

  useEffect(() => {
    if (!explaining) return;
    const id = setTimeout(() => setExplaining(false), EXPLAINING_DURATION_MS);
    return () => clearTimeout(id);
  }, [explaining, explainingGeneration]);

  useEffect(() => {
    if (!celebrating) return;
    const id = setTimeout(() => setCelebrating(false), CELEBRATING_DURATION_MS);
    return () => clearTimeout(id);
  }, [celebrating, celebratingGeneration]);

  const signals: ConversationSignals = {
    requestPending,
    hasError,
    // A cleared conversation drops any lingering window immediately.
    celebrationJustEarned: celebrating && hasMessages,
    answerJustCompleted: explaining && hasMessages,
    composing,
  };
  return mapConversationToVisualState(signals);
}
