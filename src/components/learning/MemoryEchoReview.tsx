"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { MemoryEchoItem, MemoryEchoReviewDecision } from "@/lib/types";
import { IconClose, IconInfo } from "@/components/ui/icons";

interface MemoryEchoReviewProps {
  item: MemoryEchoItem;
  onDecision: (decision: MemoryEchoReviewDecision) => void;
  onClose: () => void;
  /** Reports whether the learner is typing, so Moti can listen. */
  onTypingChange?: (typing: boolean) => void;
}

// A learner-controlled recall review. There is deliberately no AI here: the
// optional recall box is local scratch space that is never persisted and never
// sent anywhere, and the learner alone decides how it went.
export function MemoryEchoReview({
  item,
  onDecision,
  onClose,
  onTypingChange,
}: MemoryEchoReviewProps) {
  const titleId = useId();
  const inputId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  // Local scratch only — intentionally not lifted, not stored, not sent.
  const [recall, setRecall] = useState("");
  const [confirmingClose, setConfirmingClose] = useState(false);

  const hasDraft = recall.trim().length > 0;

  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => previouslyFocused.current?.focus();
  }, []);

  useEffect(() => {
    onTypingChange?.(hasDraft);
    return () => onTypingChange?.(false);
  }, [hasDraft, onTypingChange]);

  // Escape asks first when a draft would be discarded.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.stopPropagation();
      if (hasDraft) {
        setConfirmingClose(true);
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [hasDraft, onClose]);

  const requestClose = () => {
    if (hasDraft) {
      setConfirmingClose(true);
      return;
    }
    onClose();
  };

  const decisionButton =
    "rounded-full border border-moti-line bg-white px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5 focus-visible:border-moti-navy/40";

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-moti-navy/40" onClick={requestClose} />
      <div
        ref={dialogRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[85vh] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-moti-line bg-background p-4 shadow-2xl"
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id={titleId} className="text-sm font-semibold text-moti-navy">
              Memory Echo · practise recall
            </h2>
            <p className="mt-0.5 break-words text-xs text-moti-navy-soft">
              {item.conceptTitle}
              <span aria-hidden> · </span>
              {item.sourceDocumentTitle}
            </p>
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label="Close review"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
          >
            <IconClose className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-3 break-words rounded-xl border border-moti-line bg-white p-3 text-sm leading-6 text-moti-navy">
          {item.prompt}
        </p>

        <div className="mt-3">
          <label
            htmlFor={inputId}
            className="mb-1 block text-xs font-medium text-moti-navy"
          >
            Your recall (optional)
          </label>
          <textarea
            id={inputId}
            rows={3}
            value={recall}
            onChange={(event) => setRecall(event.target.value)}
            placeholder="Try to answer from memory before checking…"
            className="block w-full resize-y rounded-xl border border-moti-line bg-white px-3 py-2 text-sm leading-6 text-moti-navy placeholder:text-moti-navy-soft/70 transition-colors focus-within:border-moti-navy/40 focus:outline-none"
          />
          <p className="mt-1 flex items-start gap-1.5 text-[11px] leading-4 text-moti-navy-soft">
            <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Your recall response stays in this page and is not saved or sent to AI.
          </p>
        </div>

        {confirmingClose ? (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-moti-line bg-white px-3 py-2">
            <p className="text-xs leading-5 text-moti-navy">
              Close this review? Your notes will be discarded.
            </p>
            <div className="flex shrink-0 gap-1.5">
              <button
                type="button"
                onClick={() => setConfirmingClose(false)}
                className={decisionButton}
              >
                Keep going
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
        ) : (
          <div className="mt-4">
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-moti-navy-soft">
              How did that go? You decide — Moti does not mark this.
            </p>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => onDecision("remembered")}
                className="rounded-full border border-moti-understood/30 bg-moti-understood-bg px-2.5 py-1 text-xs font-medium text-moti-understood transition-colors hover:bg-moti-understood/10 focus-visible:border-moti-understood/50"
              >
                I remembered
              </button>
              <button
                type="button"
                onClick={() => onDecision("needs-practice")}
                className={decisionButton}
              >
                Needs more practice
              </button>
              <button
                type="button"
                onClick={() => onDecision("review-tomorrow")}
                className={decisionButton}
              >
                Review tomorrow
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
