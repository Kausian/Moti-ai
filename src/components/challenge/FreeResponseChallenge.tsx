"use client";

import { useId, type KeyboardEvent } from "react";
import type { GeneratedFreeResponseChallenge } from "@/lib/types";
import { IconClose, IconSend } from "@/components/ui/icons";
import {
  MAX_WRITTEN_ANSWER_LENGTH,
  MIN_WRITTEN_ANSWER_LENGTH,
} from "@/lib/challenge/constants";

interface FreeResponseChallengeProps {
  challenge: GeneratedFreeResponseChallenge;
  value: string;
  pending: boolean;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancelRequest: () => void;
}

// The Attempt step for correct-the-mistake and explain-in-own-words. Enter
// inserts a newline — an answer is multiline prose, so submitting on bare Enter
// would cut learners off mid-thought. Submission is an explicit button or
// Ctrl/Cmd+Enter.
export function FreeResponseChallenge({
  challenge,
  value,
  pending,
  onChange,
  onSubmit,
  onCancelRequest,
}: FreeResponseChallengeProps) {
  const inputId = useId();
  const hintId = useId();

  const trimmedLength = value.trim().length;
  const tooShort = trimmedLength > 0 && trimmedLength < MIN_WRITTEN_ANSWER_LENGTH;
  const canSubmit = trimmedLength >= MIN_WRITTEN_ANSWER_LENGTH && !pending;

  const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key === "Enter" && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      if (canSubmit) onSubmit();
    }
  };

  return (
    <div className="space-y-3">
      <p className="break-words rounded-lg border border-moti-line bg-white p-2.5 text-sm leading-6 text-moti-navy">
        {challenge.prompt}
      </p>

      <div>
        <label
          htmlFor={inputId}
          className="mb-1 block text-sm leading-6 text-moti-navy"
        >
          {challenge.instructions}
        </label>
        <textarea
          id={inputId}
          rows={4}
          value={value}
          maxLength={MAX_WRITTEN_ANSWER_LENGTH}
          disabled={pending}
          aria-describedby={hintId}
          aria-invalid={tooShort || undefined}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Write your answer in your own words…"
          className="block w-full resize-y rounded-xl border border-moti-line bg-white px-3 py-2 text-sm leading-6 text-moti-navy placeholder:text-moti-navy-soft/70 transition-colors focus-within:border-moti-navy/40 focus:outline-none disabled:opacity-60"
        />
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p id={hintId} className="text-[11px] leading-4 text-moti-navy-soft">
          {tooShort ? (
            <span className="text-moti-danger">
              Add a little more — at least {MIN_WRITTEN_ANSWER_LENGTH} characters.
            </span>
          ) : (
            <>
              {trimmedLength}/{MAX_WRITTEN_ANSWER_LENGTH} · Ctrl+Enter to submit. Moti
              marks your understanding, not your spelling.
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
            Submit answer
          </button>
        )}
      </div>
    </div>
  );
}
