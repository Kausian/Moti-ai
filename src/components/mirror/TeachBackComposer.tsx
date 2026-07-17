"use client";

import { useId, type KeyboardEvent } from "react";
import { IconClose, IconSend } from "@/components/ui/icons";
import {
  MAX_EXPLANATION_LENGTH,
  MIN_EXPLANATION_LENGTH,
} from "@/lib/mirror/constants";

interface TeachBackComposerProps {
  conceptTitle: string;
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
  onFocusChange: (focused: boolean) => void;
  onSubmit: () => void;
  onCancelRequest: () => void;
}

// The Explain step. Enter inserts a newline — an explanation is multiline prose,
// so submitting on bare Enter would truncate learners mid-thought. Submission is
// an explicit button or Ctrl/Cmd+Enter.
export function TeachBackComposer({
  conceptTitle,
  value,
  pending,
  onChange,
  onFocusChange,
  onSubmit,
  onCancelRequest,
}: TeachBackComposerProps) {
  const inputId = useId();
  const hintId = useId();

  const trimmedLength = value.trim().length;
  const tooShort = trimmedLength > 0 && trimmedLength < MIN_EXPLANATION_LENGTH;
  const canSubmit = trimmedLength >= MIN_EXPLANATION_LENGTH && !pending;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  return (
    <div className="space-y-2">
      <label htmlFor={inputId} className="block text-sm leading-6 text-moti-navy">
        Explain <span className="font-semibold">{conceptTitle}</span> in your own
        words. It is okay if you are not fully sure yet.
      </label>

      <textarea
        id={inputId}
        rows={5}
        value={value}
        maxLength={MAX_EXPLANATION_LENGTH}
        disabled={pending}
        aria-describedby={hintId}
        aria-invalid={tooShort || undefined}
        onChange={(event) => onChange(event.target.value)}
        onFocus={() => onFocusChange(true)}
        onBlur={() => onFocusChange(false)}
        onKeyDown={handleKeyDown}
        placeholder="Write your explanation here — in your own words, not copied from the source…"
        className="block w-full resize-y rounded-xl border border-moti-line bg-white px-3 py-2 text-sm leading-6 text-moti-navy placeholder:text-moti-navy-soft/70 transition-colors focus-within:border-moti-navy/40 focus:outline-none disabled:opacity-60"
      />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={hintId} className="text-[11px] leading-4 text-moti-navy-soft">
          {tooShort ? (
            <span className="text-moti-danger">
              Add a little more — at least {MIN_EXPLANATION_LENGTH} characters so Moti
              can evaluate it.
            </span>
          ) : (
            <>
              {trimmedLength}/{MAX_EXPLANATION_LENGTH} · Ctrl+Enter to submit. Moti
              evaluates your understanding, not your spelling or grammar.
            </>
          )}
        </p>

        {pending ? (
          <button
            type="button"
            onClick={onCancelRequest}
            className="inline-flex items-center gap-1.5 rounded-full border border-moti-line px-3.5 py-1.5 text-sm font-medium text-moti-navy transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
          >
            <IconClose className="h-4 w-4" />
            Cancel
          </button>
        ) : (
          <button
            type="button"
            onClick={onSubmit}
            disabled={!canSubmit}
            className="inline-flex items-center gap-1.5 rounded-full bg-moti-navy px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-moti-navy/90 focus-visible:bg-moti-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <IconSend className="h-4 w-4" />
            Submit explanation
          </button>
        )}
      </div>
    </div>
  );
}
