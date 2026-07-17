"use client";

import { useState } from "react";
import type { SaveLearningOutcomeInput } from "@/lib/types";
import { useLearningProgress } from "@/hooks/useLearningProgress";
import { formatAbsoluteDate } from "@/lib/progress/format-date";
import {
  IconAlert,
  IconCheckCircle,
  IconClock,
  IconTarget,
} from "@/components/ui/icons";

interface SaveToJourneyProps {
  /** Null when this result is not saveable (unevaluated, or no validated source). */
  outcome: SaveLearningOutcomeInput | null;
}

// The explicit save step, shared by Moti Mirror and micro-challenge feedback.
//
// Progress is never persisted automatically: the learner decides what becomes
// part of their journey, which keeps saving transparent and under their control.
// Saving is idempotent, so pressing it twice can never double-count.
export function SaveToJourney({ outcome }: SaveToJourneyProps) {
  const { isActivitySaved, saveLearningOutcome, memoryEchoItems } =
    useLearningProgress();
  const [error, setError] = useState<string | null>(null);

  if (!outcome) return null;

  const saved = isActivitySaved(outcome.activityId);

  const handleSave = () => {
    const result = saveLearningOutcome(outcome);
    setError(result.ok ? null : result.reason);
  };

  if (saved) {
    // Show what the save actually did, including any scheduled review.
    const scheduled = memoryEchoItems.find(
      (item) =>
        item.conceptTitle === outcome.conceptTitle && item.status !== "completed",
    );
    return (
      <div className="rounded-lg border border-moti-understood/25 bg-moti-understood-bg px-3 py-2">
        <p className="flex items-center gap-1.5 text-xs font-medium text-moti-understood">
          <IconCheckCircle className="h-3.5 w-3.5 shrink-0" />
          Saved locally to your learning journey
        </p>
        <p className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-moti-navy-soft">
          <span className="capitalize">{outcome.masteryRecommendation}</span>
          <span aria-hidden>·</span>
          <span className="break-words">{outcome.conceptTitle}</span>
        </p>
        {scheduled && (
          <p className="mt-1 flex items-center gap-1 text-[11px] text-moti-navy-soft">
            <IconClock className="h-3 w-3 shrink-0" />
            Memory Echo scheduled for {formatAbsoluteDate(scheduled.dueAt)}
          </p>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSave}
        className="inline-flex items-center gap-1.5 rounded-full border border-moti-navy/25 bg-moti-navy/[0.04] px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:border-moti-navy/40 hover:bg-moti-navy/10 focus-visible:border-moti-navy/50"
      >
        <IconTarget className="h-3.5 w-3.5 text-moti-navy-soft" />
        Save to learning journey
      </button>
      <p className="mt-1 text-[11px] leading-4 text-moti-navy-soft">
        Saves this concept and its recall prompt to this browser only.
      </p>
      {error && (
        <p
          role="alert"
          className="mt-1 flex items-start gap-1.5 text-[11px] leading-4 text-moti-danger"
        >
          <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
