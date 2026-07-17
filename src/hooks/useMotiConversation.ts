"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  ChatErrorPayload,
  ChatSourceInput,
  ConversationMessage,
  LearnerLevel,
  MotiStructuredResponse,
} from "@/lib/types";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import { useKnowledgeIndex } from "@/hooks/useKnowledgeIndex";
import { retrieveKnowledge } from "@/lib/retrieval/retrieve-knowledge";
import { MAX_RESULTS } from "@/lib/retrieval/constants";
import { MAX_MESSAGE_LENGTH } from "@/lib/chat/constants";
import {
  buildRequestHistory,
  selectUsedSources,
  toChatSources,
} from "@/lib/chat/conversation-history";
import { hasSessionConsent, setSessionConsent } from "@/lib/chat/ai-consent";

const LEVEL_LABEL: Record<LearnerLevel, string> = {
  beginner: "beginner",
  intermediate: "intermediate",
  advanced: "advanced",
};

export type ApiStatus =
  | "unknown"
  | "ready"
  | "not-configured"
  | "limit-reached"
  | "unavailable";

export type SendResult = "accepted" | "needs-consent" | "rejected";

export interface UseMotiConversationResult {
  messages: ConversationMessage[];
  isPending: boolean;
  error: ChatErrorPayload | null;
  canRetry: boolean;
  consentOpen: boolean;
  apiStatus: ApiStatus;
  hasAssistantAnswer: boolean;
  sendMessage: (text: string) => SendResult;
  explainSimply: () => void;
  giveExample: () => void;
  retryLast: () => void;
  cancel: () => void;
  clearConversation: () => void;
  confirmConsent: () => void;
  cancelConsent: () => void;
}

function newId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `msg_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

interface PendingTurn {
  text: string;
  retrievalQuery: string;
}

export function useMotiConversation(): UseMotiConversationResult {
  const { configuration } = useCourseConfiguration();
  const { status: indexStatus, index } = useKnowledgeIndex();

  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<ChatErrorPayload | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>("unknown");
  const [consentOpen, setConsentOpen] = useState(false);

  const messagesRef = useRef<ConversationMessage[]>([]);
  const isPendingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const lastTurnRef = useRef<PendingTurn | null>(null);
  const pendingConsentRunRef = useRef<(() => void) | null>(null);

  // Latest config/index available to async callbacks without re-creating them.
  // Synced via effects (never mutated during render).
  const configRef = useRef(configuration);
  const indexRef = useRef({ indexStatus, index });
  useEffect(() => {
    configRef.current = configuration;
  }, [configuration]);
  useEffect(() => {
    indexRef.current = { indexStatus, index };
  }, [indexStatus, index]);

  const applyMessages = useCallback(
    (updater: (prev: ConversationMessage[]) => ConversationMessage[]) => {
      const next = updater(messagesRef.current);
      messagesRef.current = next;
      setMessages(next);
    },
    [],
  );

  const setPending = useCallback((value: boolean) => {
    isPendingRef.current = value;
    setIsPending(value);
  }, []);

  const updateApiStatus = useCallback((code: ChatErrorPayload["code"]) => {
    if (code === "not-configured") setApiStatus("not-configured");
    else if (code === "rate-limited") setApiStatus("limit-reached");
    else setApiStatus("unavailable");
  }, []);

  const buildSources = useCallback((retrievalQuery: string): ChatSourceInput[] => {
    const current = indexRef.current;
    if (current.indexStatus !== "ready" || !current.index) return [];
    const results = retrieveKnowledge(current.index, retrievalQuery, {
      maxResults: MAX_RESULTS,
    }).results;
    return toChatSources(results);
  }, []);

  const performTurn = useCallback(
    async (text: string, retrievalQuery: string) => {
      const priorMessages = messagesRef.current;
      const assistantId = newId();
      lastTurnRef.current = { text, retrievalQuery };

      applyMessages((prev) => [
        ...prev,
        {
          id: newId(),
          role: "user",
          content: text,
          createdAt: new Date().toISOString(),
          status: "complete",
        },
        {
          id: assistantId,
          role: "assistant",
          content: "",
          createdAt: new Date().toISOString(),
          status: "sending",
        },
      ]);

      setError(null);
      setPending(true);
      const controller = new AbortController();
      abortRef.current = controller;

      const sources = buildSources(retrievalQuery);
      const config = configRef.current;

      try {
        const httpResponse = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            history: buildRequestHistory(priorMessages),
            course: {
              title: config.courseTitle,
              learnerLevel: config.learnerLevel,
              learningObjective: config.learningObjective,
              assistantInstructions: config.assistantInstructions,
            },
            sources,
          }),
          signal: controller.signal,
        });

        const data: unknown = await httpResponse.json();

        if (data && typeof data === "object" && "response" in data) {
          const response = (data as { response: MotiStructuredResponse }).response;
          const used = selectUsedSources(sources, response.usedSourceIds);
          applyMessages((prev) =>
            prev.map((message) =>
              message.id === assistantId
                ? {
                    ...message,
                    content: response.answer,
                    status: "complete",
                    responseMode: response.responseMode,
                    sources: used.length > 0 ? used : undefined,
                    suggestedActions:
                      response.suggestedActions.length > 0
                        ? response.suggestedActions
                        : undefined,
                  }
                : message,
            ),
          );
          setApiStatus("ready");
          lastTurnRef.current = null;
        } else {
          const payload =
            data && typeof data === "object" && "error" in data
              ? (data as { error: ChatErrorPayload }).error
              : {
                  code: "malformed-response" as const,
                  message: "Moti returned an unexpected response. Please try again.",
                  retryable: true,
                };
          applyMessages((prev) => prev.filter((m) => m.id !== assistantId));
          setError(payload);
          updateApiStatus(payload.code);
        }
      } catch {
        applyMessages((prev) => prev.filter((m) => m.id !== assistantId));
        if (controller.signal.aborted) {
          // Cancelled by the user: no fake assistant error message.
          lastTurnRef.current = null;
        } else {
          setError({
            code: "provider-error",
            message: "Moti could not reach the AI service.",
            retryable: true,
          });
          setApiStatus("unavailable");
        }
      } finally {
        abortRef.current = null;
        setPending(false);
      }
    },
    [applyMessages, buildSources, setPending, updateApiStatus],
  );

  const gate = useCallback((run: () => void): SendResult => {
    if (hasSessionConsent()) {
      run();
      return "accepted";
    }
    pendingConsentRunRef.current = run;
    setConsentOpen(true);
    return "needs-consent";
  }, []);

  const sendMessage = useCallback(
    (text: string): SendResult => {
      const trimmed = text.trim();
      if (
        trimmed.length === 0 ||
        trimmed.length > MAX_MESSAGE_LENGTH ||
        isPendingRef.current
      ) {
        return "rejected";
      }
      return gate(() => void performTurn(trimmed, trimmed));
    },
    [gate, performTurn],
  );

  const lastUserQuestion = useCallback((): string | null => {
    for (let i = messagesRef.current.length - 1; i >= 0; i -= 1) {
      const message = messagesRef.current[i];
      if (message.role === "user") return message.content;
    }
    return null;
  }, []);

  const explainSimply = useCallback(() => {
    const question = lastUserQuestion();
    if (!question || isPendingRef.current) return;
    const level = LEVEL_LABEL[configRef.current.learnerLevel];
    gate(() =>
      void performTurn(
        `Please explain your previous answer more simply, in plain language suitable for a ${level} learner.`,
        question,
      ),
    );
  }, [gate, lastUserQuestion, performTurn]);

  const giveExample = useCallback(() => {
    const question = lastUserQuestion();
    if (!question || isPendingRef.current) return;
    gate(() =>
      void performTurn(
        "Give one concrete, practical example that illustrates your previous answer, using only the provided sources.",
        question,
      ),
    );
  }, [gate, lastUserQuestion, performTurn]);

  const retryLast = useCallback(() => {
    const turn = lastTurnRef.current;
    if (!turn || isPendingRef.current) return;
    // Drop the trailing user message from the failed attempt; performTurn re-adds it.
    applyMessages((prev) => {
      if (prev.length > 0 && prev[prev.length - 1].role === "user") {
        return prev.slice(0, -1);
      }
      return prev;
    });
    setError(null);
    void performTurn(turn.text, turn.retrievalQuery);
  }, [applyMessages, performTurn]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const clearConversation = useCallback(() => {
    abortRef.current?.abort();
    applyMessages(() => []);
    setError(null);
    lastTurnRef.current = null;
  }, [applyMessages]);

  const confirmConsent = useCallback(() => {
    setSessionConsent();
    setConsentOpen(false);
    const run = pendingConsentRunRef.current;
    pendingConsentRunRef.current = null;
    run?.();
  }, []);

  const cancelConsent = useCallback(() => {
    setConsentOpen(false);
    pendingConsentRunRef.current = null;
  }, []);

  return {
    messages,
    isPending,
    error,
    // A retryable error is only ever set after a turn whose data is retained.
    canRetry: error !== null && error.retryable,
    consentOpen,
    apiStatus,
    hasAssistantAnswer: messages.some(
      (message) => message.role === "assistant" && message.status === "complete",
    ),
    sendMessage,
    explainSimply,
    giveExample,
    retryLast,
    cancel,
    clearConversation,
    confirmConsent,
    cancelConsent,
  };
}
