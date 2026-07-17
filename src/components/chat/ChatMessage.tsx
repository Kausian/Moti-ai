"use client";

import type {
  ConversationMessage,
  ConversationSource,
  MotiResponseMode,
} from "@/lib/types";
import { IconSource, IconSparkles } from "@/components/ui/icons";
import { isTeachBackEligible } from "@/lib/mirror/eligibility";
import { LearningActions } from "./LearningActions";

const MODE_LABEL: Record<MotiResponseMode, string> = {
  "grounded-answer": "Grounded answer",
  "clarifying-question": "Clarifying question",
  "insufficient-knowledge": "Not in your material",
  blocked: "Blocked",
};

interface ChatMessageItemProps {
  message: ConversationMessage;
  disabled: boolean;
  /** True when this answer's Moti Mirror activity is already open. */
  teachBackOpen: boolean;
  /** True when another answer's activity is open — only one may be active. */
  teachBackBlocked: boolean;
  onExplainSimply: () => void;
  onGiveExample: () => void;
  onAskFollowUp: () => void;
  onTeachBack: () => void;
  onPreviewSource: (source: ConversationSource) => void;
}

function TypingIndicator() {
  return (
    <span className="inline-flex items-center gap-1" aria-label="Moti is thinking">
      {[0, 1, 2].map((dot) => (
        <span
          key={dot}
          aria-hidden
          className="status-dot-pulse h-1.5 w-1.5 rounded-full bg-moti-navy-soft"
          style={{ animationDelay: `${dot * 0.2}s` }}
        />
      ))}
    </span>
  );
}

export function ChatMessageItem({
  message,
  disabled,
  teachBackOpen,
  teachBackBlocked,
  onExplainSimply,
  onGiveExample,
  onAskFollowUp,
  onTeachBack,
  onPreviewSource,
}: ChatMessageItemProps) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-moti-navy px-4 py-2.5 text-sm leading-6 text-white shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  const isSending = message.status === "sending";
  const sources = message.sources ?? [];
  // Teach-back needs a completed, grounded answer with at least one validated
  // source — never a pending, failed, unsourced, or non-grounded response.
  const canTeachBack = isTeachBackEligible(message);

  return (
    <div className="flex gap-2.5">
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-moti-pink via-moti-peach to-moti-yellow text-moti-navy"
      >
        <IconSparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-moti-navy">Moti</span>
          {message.responseMode && !isSending && (
            <span className="rounded-full bg-moti-navy/5 px-2 py-0.5 text-[11px] font-medium text-moti-navy-soft">
              {MODE_LABEL[message.responseMode]}
            </span>
          )}
        </div>

        <div className="rounded-2xl rounded-tl-md border border-moti-line bg-white px-4 py-2.5 text-sm leading-6 text-moti-navy shadow-sm">
          {isSending ? (
            <TypingIndicator />
          ) : (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        {sources.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {sources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => onPreviewSource(source)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-moti-line bg-moti-navy/[0.03] px-2.5 py-1 text-xs text-moti-navy-soft transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5 focus-visible:border-moti-navy/40"
              >
                <IconSource className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-medium text-moti-navy">
                  {source.documentTitle}
                </span>
                {source.sectionHeading && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">{source.sectionHeading}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        )}

        {!isSending && (message.suggestedActions || canTeachBack) && (
          <LearningActions
            actions={message.suggestedActions ?? []}
            hasSources={sources.length > 0}
            disabled={disabled}
            canTeachBack={canTeachBack}
            teachBackOpen={teachBackOpen}
            teachBackBlocked={teachBackBlocked}
            onExplainSimply={onExplainSimply}
            onGiveExample={onGiveExample}
            onShowSource={() => {
              if (sources.length > 0) onPreviewSource(sources[0]);
            }}
            onAskFollowUp={onAskFollowUp}
            onTeachBack={onTeachBack}
          />
        )}
      </div>
    </div>
  );
}
