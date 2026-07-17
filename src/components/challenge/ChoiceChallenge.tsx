"use client";

import { useId } from "react";
import type { GeneratedChoiceChallenge } from "@/lib/types";
import { IconClose, IconSend } from "@/components/ui/icons";
import { ChallengeOption } from "./ChallengeOption";

interface ChoiceChallengeProps {
  challenge: GeneratedChoiceChallenge;
  selectedOptionId: string | null;
  pending: boolean;
  onSelect: (optionId: string) => void;
  onSubmit: () => void;
  onCancelRequest: () => void;
}

// The Attempt step for multiple-choice and scenario challenges. A semantic
// fieldset + legend groups the radios, so the question is announced with the
// options. The answer is never rendered before submission.
export function ChoiceChallenge({
  challenge,
  selectedOptionId,
  pending,
  onSelect,
  onSubmit,
  onCancelRequest,
}: ChoiceChallengeProps) {
  const groupName = useId();

  return (
    <div className="space-y-3">
      <fieldset disabled={pending} className="min-w-0">
        <legend className="mb-2 break-words text-sm leading-6 text-moti-navy">
          {challenge.prompt}
        </legend>
        <p className="mb-2 text-xs text-moti-navy-soft">{challenge.instructions}</p>
        <div className="space-y-1.5">
          {challenge.options.map((option) => (
            <ChallengeOption
              key={option.id}
              option={option}
              name={groupName}
              checked={selectedOptionId === option.id}
              disabled={pending}
              onSelect={onSelect}
            />
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center justify-end gap-2">
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
            disabled={selectedOptionId === null}
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
