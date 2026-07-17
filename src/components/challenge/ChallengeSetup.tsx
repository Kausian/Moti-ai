"use client";

import { useId } from "react";
import type {
  LearnerLevel,
  MotiChallengeDifficulty,
  MotiChallengeType,
} from "@/lib/types";
import { IconClose, IconSparkles } from "@/components/ui/icons";

const TYPE_OPTIONS: { value: MotiChallengeType | "auto"; label: string }[] = [
  { value: "auto", label: "Surprise me" },
  { value: "multiple-choice", label: "Multiple choice" },
  { value: "scenario", label: "Scenario" },
  { value: "correct-the-mistake", label: "Correct the mistake" },
  { value: "explain-in-own-words", label: "Explain in my own words" },
];

const LEVEL_LABEL: Record<LearnerLevel, string> = {
  beginner: "Beginner",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

interface ChallengeSetupProps {
  requestedType: MotiChallengeType | "auto";
  difficulty: MotiChallengeDifficulty;
  /** The configured learner level — what "Recommended" maps to. */
  recommendedLevel: LearnerLevel;
  pending: boolean;
  onTypeChange: (type: MotiChallengeType | "auto") => void;
  onDifficultyChange: (difficulty: MotiChallengeDifficulty) => void;
  onGenerate: () => void;
  onCancel: () => void;
}

// The Prepare step: pick a challenge type and difficulty, or let Moti choose.
// Native selects keep this fully keyboard- and screen-reader-accessible without
// a component library.
export function ChallengeSetup({
  requestedType,
  difficulty,
  recommendedLevel,
  pending,
  onTypeChange,
  onDifficultyChange,
  onGenerate,
  onCancel,
}: ChallengeSetupProps) {
  const typeId = useId();
  const difficultyId = useId();
  const noteId = useId();

  // "Recommended" is not a separate stored value — it simply means the
  // configured learner level, so selecting it sets that level.
  const difficultyValue = difficulty === recommendedLevel ? "recommended" : difficulty;

  const selectClass =
    "w-full rounded-lg border border-moti-line bg-white px-2.5 py-1.5 text-sm text-moti-navy transition-colors focus-visible:border-moti-navy/40 disabled:opacity-60";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label
            htmlFor={typeId}
            className="mb-1 block text-xs font-medium text-moti-navy"
          >
            Challenge type
          </label>
          <select
            id={typeId}
            value={requestedType}
            disabled={pending}
            onChange={(event) =>
              onTypeChange(event.target.value as MotiChallengeType | "auto")
            }
            className={selectClass}
          >
            {TYPE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label
            htmlFor={difficultyId}
            className="mb-1 block text-xs font-medium text-moti-navy"
          >
            Difficulty
          </label>
          <select
            id={difficultyId}
            value={difficultyValue}
            disabled={pending}
            aria-describedby={noteId}
            onChange={(event) => {
              const value = event.target.value;
              onDifficultyChange(
                value === "recommended"
                  ? recommendedLevel
                  : (value as MotiChallengeDifficulty),
              );
            }}
            className={selectClass}
          >
            <option value="recommended">
              Recommended ({LEVEL_LABEL[recommendedLevel]})
            </option>
            <option value="beginner">Beginner</option>
            <option value="intermediate">Intermediate</option>
            <option value="advanced">Advanced</option>
          </select>
        </div>
      </div>

      <p id={noteId} className="text-[11px] leading-4 text-moti-navy-soft">
        Difficulty shapes how the challenge is written. It is not a measure of your
        ability.
      </p>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex items-center gap-1.5 rounded-full border border-moti-line px-3.5 py-1.5 text-sm font-medium text-moti-navy transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
        >
          <IconClose className="h-4 w-4" />
          Cancel
        </button>
        <button
          type="button"
          onClick={onGenerate}
          disabled={pending}
          className="inline-flex items-center gap-1.5 rounded-full bg-moti-navy px-3.5 py-1.5 text-sm font-medium text-white transition-colors hover:bg-moti-navy/90 focus-visible:bg-moti-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconSparkles className="h-4 w-4" />
          Generate challenge
        </button>
      </div>
    </div>
  );
}
