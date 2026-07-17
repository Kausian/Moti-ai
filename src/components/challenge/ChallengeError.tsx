"use client";

import type { ChatErrorPayload } from "@/lib/types";
import { IconAlert, IconRepeat } from "@/components/ui/icons";

interface ChallengeErrorProps {
  error: ChatErrorPayload;
  onRetry: () => void;
}

// A failed generation or marking never fabricates a result. The reducer preserves
// the challenge and the learner's answer, so Retry re-sends exactly what they had.
// Only the safe, categorised message is shown — never a raw provider error.
export function ChallengeError({ error, onRetry }: ChallengeErrorProps) {
  return (
    <div
      role="alert"
      className="flex flex-wrap items-start gap-2 rounded-lg border border-moti-danger/25 bg-moti-danger-bg px-3 py-2"
    >
      <IconAlert className="mt-0.5 h-4 w-4 shrink-0 text-moti-danger" />
      <p className="min-w-0 flex-1 text-xs leading-5 text-moti-danger">
        {error.message}
      </p>
      {error.retryable && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-moti-danger/30 bg-white px-2.5 py-1 text-xs font-medium text-moti-danger transition-colors hover:bg-moti-danger/5 focus-visible:bg-moti-danger/5"
        >
          <IconRepeat className="h-3.5 w-3.5" />
          Retry
        </button>
      )}
    </div>
  );
}
