"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type {
  ChallengeEvaluationResult,
  ChatErrorPayload,
  ConversationSource,
  GeneratedMotiChallenge,
  MotiChallengeDifficulty,
  MotiChallengeType,
} from "@/lib/types";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import { hasSessionConsent, setSessionConsent } from "@/lib/chat/ai-consent";
import { toChallengeSources } from "@/lib/challenge/eligibility";
import {
  attemptsRemaining,
  canRetry,
  challengeReducer,
  deriveChallengeStage,
  initialChallengeState,
  isAnswering,
  type ChallengeState,
  type MotiChallengeStage,
} from "@/lib/challenge/challenge-state";
import { isChoiceChallenge } from "@/lib/challenge/validate-generated-challenge";

export type ChallengeSendResult = "accepted" | "needs-consent" | "rejected";

export interface UseMotiChallengeResult {
  state: ChallengeState;
  stage: MotiChallengeStage;
  /** True while the learner is working on an answer (drives listening). */
  answering: boolean;
  /** Increments on each completed marking (opens the explaining window). */
  resultCount: number;
  /** Increments on each validated correct answer (opens the celebrating window). */
  celebrationCount: number;
  attemptsLeft: number;
  canRetryAnswer: boolean;
  consentOpen: boolean;
  open: (input: {
    messageId: string;
    conceptTitle: string;
    sources: ConversationSource[];
  }) => void;
  setType: (type: MotiChallengeType | "auto") => void;
  setDifficulty: (difficulty: MotiChallengeDifficulty) => void;
  generate: () => ChallengeSendResult;
  selectOption: (optionId: string) => void;
  setWrittenAnswer: (text: string) => void;
  submit: () => ChallengeSendResult;
  retry: () => void;
  reveal: () => void;
  cancel: () => void;
  close: () => void;
  confirmConsent: () => void;
  cancelConsent: () => void;
}

/**
 * Owns the micro-challenge activity. The state machine itself is the pure
 * `challengeReducer`; this hook adds the two network calls, the shared
 * session-consent gate, and cancellation.
 *
 * Challenge state is deliberately separate from the conversation and from Moti
 * Mirror: nothing here is ever written into `ConversationMessage[]`, so it can
 * never be sent to /api/chat as history. Results are in-memory only — no
 * localStorage, no Mastery Journey, no Memory Echo queue in this phase.
 */
export function useMotiChallenge(): UseMotiChallengeResult {
  const { configuration } = useCourseConfiguration();
  const [state, dispatch] = useReducer(challengeReducer, initialChallengeState);
  const [resultCount, setResultCount] = useState(0);
  const [celebrationCount, setCelebrationCount] = useState(0);
  const [consentOpen, setConsentOpen] = useState(false);

  const stateRef = useRef<ChallengeState>(state);
  const abortRef = useRef<AbortController | null>(null);
  const pendingConsentRunRef = useRef<(() => void) | null>(null);
  const configRef = useRef(configuration);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    configRef.current = configuration;
  }, [configuration]);

  // Abort any in-flight request if the activity unmounts.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const failureFor = (data: unknown): ChatErrorPayload =>
    data && typeof data === "object" && "error" in data
      ? (data as { error: ChatErrorPayload }).error
      : {
          code: "malformed-response",
          message: "Moti returned an unexpected response. Please try again.",
          retryable: true,
        };

  const runGenerate = useCallback(async () => {
    const current = stateRef.current;
    if (!current) return;

    dispatch({ type: "generate" });
    const controller = new AbortController();
    abortRef.current = controller;
    const config = configRef.current;

    try {
      const httpResponse = await fetch("/api/challenge/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptTitle: current.conceptTitle,
          requestedType: current.requestedType,
          difficulty: current.difficulty,
          course: {
            title: config.courseTitle,
            learnerLevel: config.learnerLevel,
            learningObjective: config.learningObjective,
            assistantInstructions: config.assistantInstructions,
          },
          // Only the validated sources attached to the selected answer.
          sources: toChallengeSources(current.sources),
        }),
        signal: controller.signal,
      });

      const data: unknown = await httpResponse.json();
      if (data && typeof data === "object" && "challenge" in data) {
        dispatch({
          type: "generated",
          challenge: (data as { challenge: GeneratedMotiChallenge }).challenge,
        });
      } else {
        dispatch({ type: "failure", error: failureFor(data) });
      }
    } catch {
      if (controller.signal.aborted) {
        dispatch({ type: "cancel" });
      } else {
        dispatch({
          type: "failure",
          error: {
            code: "provider-error",
            message: "Moti could not reach the AI service.",
            retryable: true,
          },
        });
      }
    } finally {
      abortRef.current = null;
    }
  }, []);

  const runEvaluate = useCallback(async () => {
    const current = stateRef.current;
    if (!current || !current.challenge) return;

    dispatch({ type: "submit" });
    const controller = new AbortController();
    abortRef.current = controller;
    const config = configRef.current;
    const challenge = current.challenge;

    try {
      const httpResponse = await fetch("/api/challenge/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          challenge,
          learnerResponse: isChoiceChallenge(challenge)
            ? { selectedOptionId: current.selectedOptionId ?? "" }
            : { writtenAnswer: current.writtenAnswer.trim() },
          // The attempt being made now is one past those already completed.
          attemptNumber: current.attempts + 1,
          course: {
            learnerLevel: config.learnerLevel,
            assistantInstructions: config.assistantInstructions,
          },
          sources: toChallengeSources(current.sources),
        }),
        signal: controller.signal,
      });

      const data: unknown = await httpResponse.json();
      if (data && typeof data === "object" && "result" in data) {
        const result = (data as { result: ChallengeEvaluationResult }).result;
        dispatch({ type: "evaluated", result });
        setResultCount((count) => count + 1);
        // Only a validated correct answer may ever celebrate.
        if (result.outcome === "correct") {
          setCelebrationCount((count) => count + 1);
        }
      } else {
        dispatch({ type: "failure", error: failureFor(data) });
      }
    } catch {
      if (controller.signal.aborted) {
        dispatch({ type: "cancel" });
      } else {
        dispatch({
          type: "failure",
          error: {
            code: "provider-error",
            message: "Moti could not reach the AI service.",
            retryable: true,
          },
        });
      }
    } finally {
      abortRef.current = null;
    }
  }, []);

  // Reuses the same session-level acknowledgement as the rest of the app.
  const gate = useCallback((run: () => void): ChallengeSendResult => {
    if (hasSessionConsent()) {
      run();
      return "accepted";
    }
    pendingConsentRunRef.current = run;
    setConsentOpen(true);
    return "needs-consent";
  }, []);

  const generate = useCallback((): ChallengeSendResult => {
    const current = stateRef.current;
    if (!current || current.pending) return "rejected";
    return gate(() => void runGenerate());
  }, [gate, runGenerate]);

  const submit = useCallback((): ChallengeSendResult => {
    const current = stateRef.current;
    if (!current || current.pending || !current.challenge) return "rejected";
    if (attemptsRemaining(current) === 0) return "rejected";
    return gate(() => void runEvaluate());
  }, [gate, runEvaluate]);

  const open = useCallback(
    (input: {
      messageId: string;
      conceptTitle: string;
      sources: ConversationSource[];
    }) => {
      abortRef.current?.abort();
      setResultCount(0);
      setCelebrationCount(0);
      dispatch({
        type: "open",
        ...input,
        // "Recommended" difficulty simply follows the configured learner level.
        difficulty: configRef.current.learnerLevel,
      });
    },
    [],
  );

  const close = useCallback(() => {
    abortRef.current?.abort();
    setResultCount(0);
    setCelebrationCount(0);
    dispatch({ type: "close" });
  }, []);

  return {
    state,
    stage: deriveChallengeStage(state),
    answering: isAnswering(state),
    resultCount,
    celebrationCount,
    attemptsLeft: attemptsRemaining(state),
    canRetryAnswer: canRetry(state),
    consentOpen,
    open,
    setType: useCallback(
      (requestedType: MotiChallengeType | "auto") =>
        dispatch({ type: "set-type", requestedType }),
      [],
    ),
    setDifficulty: useCallback(
      (difficulty: MotiChallengeDifficulty) =>
        dispatch({ type: "set-difficulty", difficulty }),
      [],
    ),
    generate,
    selectOption: useCallback(
      (optionId: string) => dispatch({ type: "select-option", optionId }),
      [],
    ),
    setWrittenAnswer: useCallback(
      (writtenAnswer: string) => dispatch({ type: "write", writtenAnswer }),
      [],
    ),
    submit,
    retry: useCallback(() => dispatch({ type: "retry" }), []),
    reveal: useCallback(() => dispatch({ type: "reveal" }), []),
    cancel: useCallback(() => abortRef.current?.abort(), []),
    close,
    confirmConsent: useCallback(() => {
      setSessionConsent();
      setConsentOpen(false);
      const run = pendingConsentRunRef.current;
      pendingConsentRunRef.current = null;
      run?.();
    }, []),
    cancelConsent: useCallback(() => {
      setConsentOpen(false);
      pendingConsentRunRef.current = null;
    }, []),
  };
}
