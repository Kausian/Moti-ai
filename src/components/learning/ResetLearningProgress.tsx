"use client";

import { useState } from "react";
import { IconReset } from "@/components/ui/icons";

interface ResetLearningProgressProps {
  courseTitle: string;
  conceptCount: number;
  reviewCount: number;
  onReset: () => void;
}

// A deliberately restrained, secondary action. It names the course, spells out
// exactly what goes, and states what it does NOT touch — resetting progress is a
// different thing from resetting the course's documents and settings.
export function ResetLearningProgress({
  courseTitle,
  conceptCount,
  reviewCount,
  onReset,
}: ResetLearningProgressProps) {
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="inline-flex items-center gap-1.5 self-start rounded-lg px-2 py-1 text-[11px] font-medium text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
      >
        <IconReset className="h-3 w-3" />
        Reset learning progress
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-moti-line bg-white p-3">
      <p className="text-xs leading-5 text-moti-navy">
        Reset learning progress for{" "}
        <span className="font-semibold">{courseTitle}</span>?
      </p>
      <p className="mt-1 text-[11px] leading-4 text-moti-navy-soft">
        This removes {conceptCount} concept{conceptCount === 1 ? "" : "s"} and{" "}
        {reviewCount} review item{reviewCount === 1 ? "" : "s"} from this browser.
        Your course documents and settings are not affected.
      </p>
      <div className="mt-2 flex flex-wrap justify-end gap-1.5">
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-full border border-moti-line px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:bg-moti-navy/5"
        >
          Keep my progress
        </button>
        <button
          type="button"
          onClick={() => {
            onReset();
            setConfirming(false);
          }}
          className="rounded-full bg-moti-danger px-2.5 py-1 text-xs font-medium text-white transition-colors hover:bg-moti-danger/90"
        >
          Reset progress
        </button>
      </div>
    </div>
  );
}
