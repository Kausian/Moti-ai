"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { ConversationSource, MotiLearningLoopStage } from "@/lib/types";
import type { MirrorActivity } from "@/lib/mirror/mirror-state";
import { IconClose, IconInfo, IconSparkles } from "@/components/ui/icons";
import { TeachBackComposer } from "./TeachBackComposer";
import { MotiMirrorFeedback } from "./MotiMirrorFeedback";
import { MirrorError } from "./MirrorError";

const STAGE_LABEL: Record<MotiLearningLoopStage, string> = {
  think: "Think",
  explain: "Explain",
  correct: "Correct",
  remember: "Remember",
};

interface MotiMirrorActivityProps {
  activity: MirrorActivity;
  stage: MotiLearningLoopStage;
  onExplanationChange: (value: string) => void;
  onFocusChange: (focused: boolean) => void;
  onSubmit: () => void;
  onRetry: () => void;
  onCancelRequest: () => void;
  onEdit: () => void;
  onGiveExample: () => void;
  onClose: () => void;
  onPreviewSource: (source: ConversationSource) => void;
}

// The inline Moti Mirror learning activity, anchored to the grounded answer it
// belongs to. It owns only presentation and focus behaviour; the state machine
// lives in the pure mirrorReducer.
export function MotiMirrorActivity({
  activity,
  stage,
  onExplanationChange,
  onFocusChange,
  onSubmit,
  onRetry,
  onCancelRequest,
  onEdit,
  onGiveExample,
  onClose,
  onPreviewSource,
}: MotiMirrorActivityProps) {
  const titleId = useId();
  const regionRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const hasUnsentExplanation =
    activity.learnerExplanation.trim().length > 0 && activity.feedback === null;

  // Move focus into the activity when it opens, and restore it to the
  // "Teach it back" trigger when it closes.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    regionRef.current?.focus();
    return () => previouslyFocused.current?.focus();
  }, []);

  // Escape closes only when nothing would be lost: never while a request is in
  // flight, and it asks first when an unsent explanation would be discarded.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (activity.pending) return;
      event.stopPropagation();
      if (hasUnsentExplanation) {
        setConfirmingClose(true);
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activity.pending, hasUnsentExplanation, onClose]);

  const requestClose = () => {
    if (hasUnsentExplanation) {
      setConfirmingClose(true);
      return;
    }
    onClose();
  };

  const sourceCount = activity.sources.length;

  return (
    <section
      ref={regionRef}
      tabIndex={-1}
      aria-labelledby={titleId}
      className="rounded-2xl border border-moti-navy/15 bg-moti-navy/[0.02] p-3 shadow-sm sm:p-4"
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3
            id={titleId}
            className="flex items-center gap-1.5 text-sm font-semibold text-moti-navy"
          >
            <IconSparkles className="h-4 w-4 shrink-0 text-moti-navy-soft" />
            Moti Mirror · teach it back
          </h3>
          <p className="mt-0.5 break-words text-xs text-moti-navy-soft">
            <span className="font-medium text-moti-navy">{activity.conceptTitle}</span>
            <span aria-hidden> · </span>
            {sourceCount} source{sourceCount === 1 ? "" : "s"}
            <span aria-hidden> · </span>
            Step: {STAGE_LABEL[stage]}
          </p>
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close Moti Mirror"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>

      {confirmingClose && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-moti-line bg-white px-3 py-2">
          <p className="text-xs leading-5 text-moti-navy">
            Close Moti Mirror? Your explanation will be discarded.
          </p>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => setConfirmingClose(false)}
              className="rounded-full border border-moti-line px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:bg-moti-navy/5"
            >
              Keep writing
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-moti-navy px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-moti-navy/90"
            >
              Discard
            </button>
          </div>
        </div>
      )}

      {/* Announce evaluation status and completion, not decorative transitions. */}
      <p aria-live="polite" className="sr-only">
        {activity.pending
          ? "Moti is evaluating your explanation."
          : activity.feedback
            ? "Moti Mirror feedback is ready."
            : ""}
      </p>

      <div className="mt-3 space-y-3">
        {activity.error && <MirrorError error={activity.error} onRetry={onRetry} />}

        {activity.feedback ? (
          <MotiMirrorFeedback
            feedback={activity.feedback}
            sources={activity.sources}
            activityId={activity.feedbackActivityId}
            onEdit={onEdit}
            onGiveExample={onGiveExample}
            onClose={onClose}
            onPreviewSource={onPreviewSource}
          />
        ) : (
          <TeachBackComposer
            conceptTitle={activity.conceptTitle}
            value={activity.learnerExplanation}
            pending={activity.pending}
            onChange={onExplanationChange}
            onFocusChange={onFocusChange}
            onSubmit={onSubmit}
            onCancelRequest={onCancelRequest}
          />
        )}

        <p className="flex items-start gap-1.5 text-[11px] leading-4 text-moti-navy-soft">
          <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Your explanation and the supporting source excerpts are sent to the
          configured Gemini API for feedback.
        </p>
      </div>
    </section>
  );
}
