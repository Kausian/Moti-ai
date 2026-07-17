"use client";

import { useEffect, useId, useRef, useState } from "react";
import type {
  ConversationSource,
  GeneratedChoiceChallenge,
  GeneratedFreeResponseChallenge,
  LearnerLevel,
  MotiChallengeType,
} from "@/lib/types";
import type {
  ChallengeActivity,
  MotiChallengeStage,
} from "@/lib/challenge/challenge-state";
import { MAX_CHALLENGE_ATTEMPTS } from "@/lib/challenge/constants";
import { isChoiceChallenge } from "@/lib/challenge/validate-generated-challenge";
import { IconClose, IconInfo, IconLightbulb, IconTarget } from "@/components/ui/icons";
import { ChallengeSetup } from "./ChallengeSetup";
import { ChoiceChallenge } from "./ChoiceChallenge";
import { FreeResponseChallenge } from "./FreeResponseChallenge";
import { ChallengeFeedback } from "./ChallengeFeedback";
import { ChallengeError } from "./ChallengeError";

/**
 * The challenge has its own lightweight progress labels. It deliberately does NOT
 * reuse Think → Explain → Correct → Remember: a challenge is a focused practice
 * task, not the full Moti Learning Loop, and conflating them would misrepresent
 * the product's identity.
 */
const STAGE_LABEL: Record<MotiChallengeStage, string> = {
  setup: "Prepare",
  generating: "Prepare",
  answering: "Attempt",
  evaluating: "Check",
  feedback: "Check",
  complete: "Review",
};

const TYPE_LABEL: Record<MotiChallengeType, string> = {
  "multiple-choice": "Multiple choice",
  scenario: "Scenario",
  "correct-the-mistake": "Correct the mistake",
  "explain-in-own-words": "Explain in your own words",
};

interface MotiChallengeActivityProps {
  activity: ChallengeActivity;
  stage: MotiChallengeStage;
  recommendedLevel: LearnerLevel;
  canRetryAnswer: boolean;
  onTypeChange: (type: MotiChallengeType | "auto") => void;
  onDifficultyChange: (difficulty: ChallengeActivity["difficulty"]) => void;
  onGenerate: () => void;
  onSelectOption: (optionId: string) => void;
  onWrite: (value: string) => void;
  onSubmit: () => void;
  onRetryRequest: () => void;
  onRetryAnswer: () => void;
  onReveal: () => void;
  onCancelRequest: () => void;
  onClose: () => void;
  onPreviewSource: (source: ConversationSource) => void;
}

// The inline micro-challenge activity, anchored to the grounded answer it came
// from. It owns only presentation and focus behaviour; the state machine lives in
// the pure challengeReducer.
export function MotiChallengeActivity({
  activity,
  stage,
  recommendedLevel,
  canRetryAnswer,
  onTypeChange,
  onDifficultyChange,
  onGenerate,
  onSelectOption,
  onWrite,
  onSubmit,
  onRetryRequest,
  onRetryAnswer,
  onReveal,
  onCancelRequest,
  onClose,
  onPreviewSource,
}: MotiChallengeActivityProps) {
  const titleId = useId();
  const regionRef = useRef<HTMLElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);
  const [confirmingClose, setConfirmingClose] = useState(false);

  const hasUnsentAnswer =
    activity.challenge !== null &&
    activity.result === null &&
    !activity.revealed &&
    (activity.selectedOptionId !== null || activity.writtenAnswer.trim().length > 0);

  // Move focus into the activity when it opens, and restore it to the
  // "Challenge me" trigger when it closes.
  useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    regionRef.current?.focus();
    return () => previouslyFocused.current?.focus();
  }, []);

  // Escape closes only when nothing would be lost: never while a request is in
  // flight, and it asks first when an unsent answer would be discarded.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      if (activity.pending) return;
      event.stopPropagation();
      if (hasUnsentAnswer) {
        setConfirmingClose(true);
        return;
      }
      onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [activity.pending, hasUnsentAnswer, onClose]);

  const requestClose = () => {
    if (hasUnsentAnswer) {
      setConfirmingClose(true);
      return;
    }
    onClose();
  };

  const { challenge, sources } = activity;
  const sourceCount = sources.length;

  // The full answer lives in the client-held challenge (see the documented
  // prototype limitation); revealing shows it without another request.
  const revealedAnswer =
    challenge === null
      ? null
      : isChoiceChallenge(challenge)
        ? (challenge as GeneratedChoiceChallenge).referenceExplanation
        : (challenge as GeneratedFreeResponseChallenge).referenceAnswer;

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
            <IconTarget className="h-4 w-4 shrink-0 text-moti-navy-soft" />
            Micro-challenge
          </h3>
          <p className="mt-0.5 break-words text-xs text-moti-navy-soft">
            <span className="font-medium text-moti-navy">{activity.conceptTitle}</span>
            {challenge && (
              <>
                <span aria-hidden> · </span>
                {TYPE_LABEL[challenge.challengeType]}
              </>
            )}
            <span aria-hidden> · </span>
            {activity.difficulty}
            <span aria-hidden> · </span>
            {sourceCount} source{sourceCount === 1 ? "" : "s"}
            <span aria-hidden> · </span>
            Step: {STAGE_LABEL[stage]}
          </p>
        </div>
        <button
          type="button"
          onClick={requestClose}
          aria-label="Close challenge"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>

      {confirmingClose && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-moti-line bg-white px-3 py-2">
          <p className="text-xs leading-5 text-moti-navy">
            Close this challenge? Your answer will be discarded.
          </p>
          <div className="flex shrink-0 gap-1.5">
            <button
              type="button"
              onClick={() => setConfirmingClose(false)}
              className="rounded-full border border-moti-line px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:bg-moti-navy/5"
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
      )}

      {/* Announce real progress, not decorative transitions. */}
      <p aria-live="polite" className="sr-only">
        {stage === "generating"
          ? "Moti is writing your challenge."
          : stage === "evaluating"
            ? "Moti is marking your answer."
            : activity.result
              ? `Result: ${activity.result.outcome.replace("-", " ")}.`
              : ""}
      </p>

      <div className="mt-3 space-y-3">
        {activity.error && (
          <ChallengeError error={activity.error} onRetry={onRetryRequest} />
        )}

        {activity.revealed && revealedAnswer && (
          <section className="space-y-1.5">
            <h4 className="flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-moti-navy-soft">
              <IconLightbulb className="h-3.5 w-3.5" />
              The answer
            </h4>
            <p className="break-words rounded-lg border border-moti-line bg-white p-2.5 text-sm leading-6 text-moti-navy">
              {revealedAnswer}
            </p>
            <p className="text-[11px] leading-4 text-moti-navy-soft">
              You revealed the answer, so this challenge is complete.
            </p>
            <div className="flex flex-wrap gap-1.5 pt-1">
              <button
                type="button"
                onClick={onGenerate}
                className="inline-flex items-center gap-1.5 rounded-full border border-moti-line bg-white px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5"
              >
                <IconTarget className="h-3.5 w-3.5 text-moti-navy-soft" />
                Try another
              </button>
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center gap-1.5 rounded-full border border-moti-line bg-white px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5"
              >
                Back to the conversation
              </button>
            </div>
          </section>
        )}

        {!activity.revealed && challenge === null && (
          <ChallengeSetup
            requestedType={activity.requestedType}
            difficulty={activity.difficulty}
            recommendedLevel={recommendedLevel}
            pending={activity.pending}
            onTypeChange={onTypeChange}
            onDifficultyChange={onDifficultyChange}
            onGenerate={onGenerate}
            onCancel={activity.pending ? onCancelRequest : onClose}
          />
        )}

        {!activity.revealed && challenge !== null && activity.result === null && (
          isChoiceChallenge(challenge) ? (
            <ChoiceChallenge
              challenge={challenge as GeneratedChoiceChallenge}
              selectedOptionId={activity.selectedOptionId}
              pending={activity.pending}
              onSelect={onSelectOption}
              onSubmit={onSubmit}
              onCancelRequest={onCancelRequest}
            />
          ) : (
            <FreeResponseChallenge
              challenge={challenge as GeneratedFreeResponseChallenge}
              value={activity.writtenAnswer}
              pending={activity.pending}
              onChange={onWrite}
              onSubmit={onSubmit}
              onCancelRequest={onCancelRequest}
            />
          )
        )}

        {!activity.revealed && activity.result !== null && challenge !== null && (
          <ChallengeFeedback
            result={activity.result}
            sources={sources}
            challenge={challenge}
            attempts={activity.attempts}
            maxAttempts={MAX_CHALLENGE_ATTEMPTS}
            canRetry={canRetryAnswer}
            revealed={activity.revealed}
            onRetry={onRetryAnswer}
            onReveal={onReveal}
            onTryAnother={onGenerate}
            onClose={onClose}
            onPreviewSource={onPreviewSource}
          />
        )}

        <p className="flex items-start gap-1.5 text-[11px] leading-4 text-moti-navy-soft">
          <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          To generate and evaluate this challenge, the selected concept, challenge
          response, course configuration and up to four supporting source excerpts
          may be sent to the configured Gemini API. Your full document collection is
          not sent.
        </p>
      </div>
    </section>
  );
}
