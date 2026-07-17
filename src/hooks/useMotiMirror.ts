"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import type {
  ChatErrorPayload,
  ConversationSource,
  MotiLearningLoopStage,
  MotiMirrorStructuredResponse,
} from "@/lib/types";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import { hasSessionConsent, setSessionConsent } from "@/lib/chat/ai-consent";
import { toTeachBackSources } from "@/lib/mirror/eligibility";
import {
  deriveLoopStage,
  initialMirrorState,
  isDrafting,
  mirrorReducer,
  type MirrorState,
} from "@/lib/mirror/mirror-state";

export type MirrorSendResult = "accepted" | "needs-consent" | "rejected";

export interface UseMotiMirrorResult {
  state: MirrorState;
  /** The Moti Learning Loop stage derived from the real activity. */
  stage: MotiLearningLoopStage;
  /** True while the learner is drafting (drives Moti's listening state). */
  drafting: boolean;
  /** Increments on each successful evaluation (opens the explaining window). */
  feedbackCount: number;
  consentOpen: boolean;
  open: (input: {
    messageId: string;
    conceptTitle: string;
    sources: ConversationSource[];
  }) => void;
  setExplanation: (text: string) => void;
  setComposerFocused: (focused: boolean) => void;
  submit: () => MirrorSendResult;
  retry: () => MirrorSendResult;
  cancel: () => void;
  edit: () => void;
  close: () => void;
  confirmConsent: () => void;
  cancelConsent: () => void;
}

/**
 * Owns the Moti Mirror activity. The state machine itself is the pure
 * `mirrorReducer`; this hook adds the network call, the shared session-consent
 * gate, and cancellation.
 *
 * Moti Mirror state is deliberately separate from the conversation: nothing here
 * is ever written into `ConversationMessage[]`, so teach-back content can never
 * be sent to /api/chat as history. Results are in-memory only — no localStorage
 * in this phase.
 */
export function useMotiMirror(): UseMotiMirrorResult {
  const { configuration } = useCourseConfiguration();
  const [state, dispatch] = useReducer(mirrorReducer, initialMirrorState);
  const [composerFocused, setComposerFocused] = useState(false);
  const [feedbackCount, setFeedbackCount] = useState(0);
  const [consentOpen, setConsentOpen] = useState(false);

  const stateRef = useRef<MirrorState>(state);
  const abortRef = useRef<AbortController | null>(null);
  const pendingConsentRunRef = useRef<(() => void) | null>(null);
  const configRef = useRef(configuration);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);
  useEffect(() => {
    configRef.current = configuration;
  }, [configuration]);

  // Abort any in-flight evaluation if the activity unmounts.
  useEffect(() => {
    return () => abortRef.current?.abort();
  }, []);

  const evaluate = useCallback(async () => {
    const current = stateRef.current;
    if (!current) return;

    dispatch({ type: "submit" });
    const controller = new AbortController();
    abortRef.current = controller;
    const config = configRef.current;

    try {
      const httpResponse = await fetch("/api/teach-back", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conceptTitle: current.conceptTitle,
          learnerExplanation: current.learnerExplanation.trim(),
          course: {
            title: config.courseTitle,
            learnerLevel: config.learnerLevel,
            learningObjective: config.learningObjective,
            assistantInstructions: config.assistantInstructions,
          },
          // Only the validated sources attached to the selected answer.
          sources: toTeachBackSources(current.sources),
        }),
        signal: controller.signal,
      });

      const data: unknown = await httpResponse.json();

      if (data && typeof data === "object" && "response" in data) {
        const feedback = (data as { response: MotiMirrorStructuredResponse }).response;
        dispatch({ type: "success", feedback });
        setFeedbackCount((count) => count + 1);
      } else {
        const payload =
          data && typeof data === "object" && "error" in data
            ? (data as { error: ChatErrorPayload }).error
            : {
                code: "malformed-response" as const,
                message: "Moti returned an unexpected response. Please try again.",
                retryable: true,
              };
        dispatch({ type: "failure", error: payload });
      }
    } catch {
      if (controller.signal.aborted) {
        // Cancelled by the learner: no error, explanation preserved.
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

  // Reuses the same session-level acknowledgement as the normal conversation.
  const gate = useCallback((run: () => void): MirrorSendResult => {
    if (hasSessionConsent()) {
      run();
      return "accepted";
    }
    pendingConsentRunRef.current = run;
    setConsentOpen(true);
    return "needs-consent";
  }, []);

  const submit = useCallback((): MirrorSendResult => {
    const current = stateRef.current;
    if (!current || current.pending) return "rejected";
    return gate(() => void evaluate());
  }, [evaluate, gate]);

  const open = useCallback(
    (input: { messageId: string; conceptTitle: string; sources: ConversationSource[] }) => {
      abortRef.current?.abort();
      setComposerFocused(false);
      dispatch({ type: "open", ...input });
    },
    [],
  );

  const close = useCallback(() => {
    abortRef.current?.abort();
    setComposerFocused(false);
    setFeedbackCount(0);
    dispatch({ type: "close" });
  }, []);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return {
    state,
    stage: deriveLoopStage(state, { composerFocused }),
    drafting: isDrafting(state, { composerFocused }),
    feedbackCount,
    consentOpen,
    open,
    setExplanation: useCallback(
      (text: string) => dispatch({ type: "draft", learnerExplanation: text }),
      [],
    ),
    setComposerFocused,
    submit,
    retry: submit,
    cancel,
    edit: useCallback(() => dispatch({ type: "edit" }), []),
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
