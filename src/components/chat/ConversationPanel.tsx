"use client";

import { useEffect, useRef, useState } from "react";
import type { ConversationSource } from "@/lib/types";
import type {
  ApiStatus,
  UseMotiConversationResult,
} from "@/hooks/useMotiConversation";
import type { UseMotiMirrorResult } from "@/hooks/useMotiMirror";
import type { UseMotiChallengeResult } from "@/hooks/useMotiChallenge";
import { deriveConceptTitle } from "@/lib/mirror/eligibility";
import { MotiMirrorActivity } from "@/components/mirror/MotiMirrorActivity";
import { MotiChallengeActivity } from "@/components/challenge/MotiChallengeActivity";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import {
  PlainTextPreviewDialog,
  type PreviewContent,
} from "@/components/ui/PlainTextPreviewDialog";
import { IconReset } from "@/components/ui/icons";
import { ChatMessageItem } from "./ChatMessage";
import { MessageComposer, type MessageComposerHandle } from "./MessageComposer";
import { SuggestedPrompts } from "./SuggestedPrompts";
import { AiPrivacyNotice } from "./AiPrivacyNotice";
import { AiConsentDialog } from "./AiConsentDialog";
import { ConversationError } from "./ConversationError";

const API_STATUS_LABEL: Partial<Record<ApiStatus, string>> = {
  ready: "AI ready",
  "not-configured": "AI not configured",
  "limit-reached": "Usage limit reached",
  unavailable: "AI service unavailable",
};

function sourceToPreview(source: ConversationSource): PreviewContent {
  const heading = source.sectionHeading ? `§ ${source.sectionHeading} · ` : "";
  return {
    title: source.documentTitle,
    subtitle: `${heading}Chunk ${source.chunkIndex + 1}`,
    note: "This excerpt was supplied to Gemini for the answer — plain text.",
    body: source.content,
  };
}

interface ConversationPanelProps {
  /** The shared conversation state, owned by the workspace so Moti can react to it. */
  conversation: UseMotiConversationResult;
  /** The shared Moti Mirror activity, owned by the workspace (drives the loop + avatar). */
  mirror: UseMotiMirrorResult;
  /** The shared micro-challenge activity, owned by the workspace (drives the avatar). */
  challenge: UseMotiChallengeResult;
  /** Reports whether the learner is actively composing (drives Moti's listening state). */
  onComposerActiveChange?: (active: boolean) => void;
}

export function ConversationPanel({
  conversation,
  mirror,
  challenge,
  onComposerActiveChange,
}: ConversationPanelProps) {
  const { configuration } = useCourseConfiguration();
  const {
    messages,
    isPending,
    error,
    canRetry,
    consentOpen,
    apiStatus,
    sendMessage,
    explainSimply,
    giveExample,
    retryLast,
    cancel,
    clearConversation,
    confirmConsent,
    cancelConsent,
  } = conversation;

  const [preview, setPreview] = useState<PreviewContent | null>(null);
  const composerRef = useRef<MessageComposerHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const wasPending = useRef(false);

  // Auto-scroll to the newest message.
  useEffect(() => {
    const node = scrollRef.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages]);

  // Return focus to the composer after a request settles successfully.
  useEffect(() => {
    if (wasPending.current && !isPending && !error) {
      composerRef.current?.focus();
    }
    wasPending.current = isPending;
  }, [isPending, error]);

  const handleSend = (text: string) => {
    if (sendMessage(text) === "accepted") composerRef.current?.clear();
  };

  const statusLabel = API_STATUS_LABEL[apiStatus];
  const latestAnswer = [...messages]
    .reverse()
    .find((message) => message.role === "assistant" && message.status === "complete");

  return (
    <section
      aria-label="Learning conversation"
      className="flex h-full min-h-0 flex-col rounded-2xl border border-moti-line bg-moti-surface shadow-sm"
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-moti-line px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-moti-navy">Learning conversation</p>
          <p className="text-xs text-moti-navy-soft">
            Grounded in your course materials
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {statusLabel && (
            <span className="hidden rounded-full bg-moti-navy/5 px-2 py-0.5 text-[11px] font-medium text-moti-navy-soft sm:inline">
              {statusLabel}
            </span>
          )}
          {messages.length > 0 && (
            <button
              type="button"
              onClick={clearConversation}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
            >
              <IconReset className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
      >
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center py-6">
            <SuggestedPrompts onSelect={handleSend} disabled={isPending} />
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className="space-y-3">
              <ChatMessageItem
                message={message}
                disabled={isPending}
                teachBackOpen={mirror.state?.messageId === message.id}
                // Only one AI learning activity may run at a time: any other open
                // activity blocks a new one rather than silently discarding it.
                teachBackBlocked={
                  (mirror.state !== null && mirror.state.messageId !== message.id) ||
                  challenge.state !== null
                }
                challengeOpen={challenge.state?.messageId === message.id}
                challengeBlocked={
                  (challenge.state !== null &&
                    challenge.state.messageId !== message.id) ||
                  mirror.state !== null
                }
                onExplainSimply={explainSimply}
                onGiveExample={giveExample}
                onAskFollowUp={() => composerRef.current?.focus()}
                onTeachBack={() => {
                  const sources = message.sources ?? [];
                  const conceptTitle = deriveConceptTitle(sources);
                  if (!conceptTitle) return;
                  mirror.open({ messageId: message.id, conceptTitle, sources });
                }}
                onChallenge={() => {
                  const sources = message.sources ?? [];
                  const conceptTitle = deriveConceptTitle(sources);
                  if (!conceptTitle) return;
                  challenge.open({ messageId: message.id, conceptTitle, sources });
                }}
                onPreviewSource={(source) => setPreview(sourceToPreview(source))}
              />

              {/* The activity is inline, anchored to the answer it teaches back. */}
              {mirror.state?.messageId === message.id && (
                <MotiMirrorActivity
                  activity={mirror.state}
                  stage={mirror.stage}
                  onExplanationChange={mirror.setExplanation}
                  onFocusChange={mirror.setComposerFocused}
                  onSubmit={mirror.submit}
                  onRetry={mirror.retry}
                  onCancelRequest={mirror.cancel}
                  onEdit={mirror.edit}
                  onGiveExample={() => {
                    mirror.close();
                    giveExample();
                  }}
                  onClose={mirror.close}
                  onPreviewSource={(source) => setPreview(sourceToPreview(source))}
                />
              )}

              {/* The challenge is inline, anchored to the answer it came from. */}
              {challenge.state?.messageId === message.id && (
                <MotiChallengeActivity
                  activity={challenge.state}
                  stage={challenge.stage}
                  recommendedLevel={configuration.learnerLevel}
                  canRetryAnswer={challenge.canRetryAnswer}
                  onTypeChange={challenge.setType}
                  onDifficultyChange={challenge.setDifficulty}
                  onGenerate={challenge.generate}
                  onSelectOption={challenge.selectOption}
                  onWrite={challenge.setWrittenAnswer}
                  onSubmit={challenge.submit}
                  onRetryRequest={() =>
                    challenge.state?.challenge
                      ? challenge.submit()
                      : challenge.generate()
                  }
                  onRetryAnswer={challenge.retry}
                  onReveal={challenge.reveal}
                  onCancelRequest={challenge.cancel}
                  onClose={challenge.close}
                  onPreviewSource={(source) => setPreview(sourceToPreview(source))}
                />
              )}
            </div>
          ))
        )}
      </div>

      {/* Screen-reader announcement of the latest answer. */}
      <div aria-live="polite" className="sr-only">
        {latestAnswer?.content ?? ""}
      </div>

      <div className="shrink-0 space-y-2 border-t border-moti-line p-3">
        {error && (
          <ConversationError error={error} canRetry={canRetry} onRetry={retryLast} />
        )}
        <AiPrivacyNotice />
        <MessageComposer
          ref={composerRef}
          onSend={handleSend}
          onCancel={cancel}
          isPending={isPending}
          onActiveChange={onComposerActiveChange}
        />
        <p className="px-1 text-[11px] text-moti-navy-soft">
          Open a grounded answer&apos;s actions to teach it back or take a challenge.
        </p>
      </div>

      <AiConsentDialog
        open={consentOpen}
        onCancel={cancelConsent}
        onContinue={() => {
          confirmConsent();
          composerRef.current?.clear();
        }}
      />

      {/* Moti Mirror reuses the same session acknowledgement and dialog — it is
          only reached when the learner has not yet accepted in this session. */}
      <AiConsentDialog
        open={mirror.consentOpen}
        onCancel={mirror.cancelConsent}
        onContinue={mirror.confirmConsent}
      />

      {/* Challenges reuse the same session acknowledgement and dialog. */}
      <AiConsentDialog
        open={challenge.consentOpen}
        onCancel={challenge.cancelConsent}
        onContinue={challenge.confirmConsent}
      />

      <PlainTextPreviewDialog content={preview} onClose={() => setPreview(null)} />
    </section>
  );
}
