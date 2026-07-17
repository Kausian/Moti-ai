"use client";

import type {
  ChallengeEvaluationResult,
  ChallengeNextAction,
  ChallengeOutcome,
  ConversationSource,
  MasteryStatus,
  MotiMirrorMasteryRecommendation,
} from "@/lib/types";
import { MasteryBadge } from "@/components/ui/MasteryBadge";
import {
  IconAlert,
  IconBook,
  IconCheckCircle,
  IconLightbulb,
  IconRepeat,
  IconSource,
  IconTarget,
} from "@/components/ui/icons";
import { ChallengeMemoryEchoPreview } from "./ChallengeMemoryEchoPreview";

// Outcome is always communicated by an icon plus a text label, never by colour.
const OUTCOME_CONFIG: Record<
  ChallengeOutcome,
  { label: string; Icon: typeof IconCheckCircle; className: string }
> = {
  correct: {
    label: "Correct",
    Icon: IconCheckCircle,
    className: "text-moti-understood bg-moti-understood-bg border-moti-understood/25",
  },
  "partially-correct": {
    label: "Partly correct",
    Icon: IconTarget,
    className: "text-moti-developing bg-moti-developing-bg border-moti-developing/25",
  },
  incorrect: {
    label: "Not quite",
    Icon: IconAlert,
    className: "text-moti-exploring bg-moti-exploring-bg border-moti-exploring/25",
  },
  "not-evaluated": {
    label: "Not evaluated",
    Icon: IconAlert,
    className: "text-moti-navy-soft bg-moti-navy/5 border-moti-line",
  },
};

const NEXT_ACTION_LABEL: Record<ChallengeNextAction, string> = {
  continue: "Return to the conversation",
  retry: "Try this challenge again",
  "review-source": "Review the supporting source",
  "try-another": "Try another challenge",
};

interface ChallengeFeedbackProps {
  result: ChallengeEvaluationResult;
  sources: ConversationSource[];
  attempts: number;
  maxAttempts: number;
  canRetry: boolean;
  /** True once the full explanation has been revealed (or the challenge ended). */
  revealed: boolean;
  onRetry: () => void;
  onReveal: () => void;
  onTryAnother: () => void;
  onClose: () => void;
  onPreviewSource: (source: ConversationSource) => void;
}

function isMasteryStatus(
  value: MotiMirrorMasteryRecommendation,
): value is MasteryStatus {
  return value === "exploring" || value === "developing" || value === "understood";
}

function Section({
  title,
  Icon,
  children,
}: {
  title: string;
  Icon: typeof IconCheckCircle;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h4 className="mb-1.5 flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wide text-moti-navy-soft">
        <Icon className="h-3.5 w-3.5" />
        {title}
      </h4>
      {children}
    </section>
  );
}

// The Check + Review steps. Empty sections are hidden rather than padded with
// filler, and the mastery recommendation is always labelled as a prototype
// recommendation that has not changed the Mastery Journey. All model text renders
// as plain text (React-escaped) — no Markdown or HTML is interpreted.
export function ChallengeFeedback({
  result,
  sources,
  attempts,
  maxAttempts,
  canRetry,
  revealed,
  onRetry,
  onReveal,
  onTryAnother,
  onClose,
  onPreviewSource,
}: ChallengeFeedbackProps) {
  const outcome = OUTCOME_CONFIG[result.outcome];
  const usedSources = result.usedSourceIds
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is ConversationSource => source !== undefined);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${outcome.className}`}
        >
          <outcome.Icon className="h-3.5 w-3.5" />
          {outcome.label}
        </span>
        <span className="text-[11px] text-moti-navy-soft">
          Attempt {attempts} of {maxAttempts}
        </span>
      </div>

      <p className="break-words text-sm leading-6 text-moti-navy">{result.feedback}</p>

      {result.correctUnderstanding.length > 0 && (
        <Section title="What you got right" Icon={IconCheckCircle}>
          <ul className="space-y-1">
            {result.correctUnderstanding.map((item) => (
              <li
                key={item}
                className="flex items-start gap-1.5 text-sm leading-6 text-moti-navy"
              >
                <IconCheckCircle className="mt-1 h-3.5 w-3.5 shrink-0 text-moti-understood" />
                <span className="break-words">{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {result.missingPoints.length > 0 && (
        <Section title="What is missing" Icon={IconTarget}>
          <ul className="space-y-1">
            {result.missingPoints.map((item) => (
              <li
                key={item}
                className="flex items-start gap-1.5 text-sm leading-6 text-moti-navy"
              >
                <IconTarget className="mt-1 h-3.5 w-3.5 shrink-0 text-moti-developing" />
                <span className="break-words">{item}</span>
              </li>
            ))}
          </ul>
        </Section>
      )}

      {result.correction && (
        <Section title="Correction" Icon={IconAlert}>
          <p className="break-words rounded-lg border border-moti-line bg-moti-navy/[0.02] p-2.5 text-sm leading-6 text-moti-navy">
            {result.correction}
          </p>
        </Section>
      )}

      {result.explanation.length > 0 && (
        <Section
          title={canRetry ? "A nudge before you retry" : "Why"}
          Icon={IconLightbulb}
        >
          <p className="break-words rounded-lg border border-moti-line bg-white p-2.5 text-sm leading-6 text-moti-navy">
            {result.explanation}
          </p>
        </Section>
      )}

      {result.masteryRecommendation !== "not-evaluated" && (
        <Section title="Mastery recommendation" Icon={IconTarget}>
          {isMasteryStatus(result.masteryRecommendation) && (
            <MasteryBadge status={result.masteryRecommendation} />
          )}
          <p className="mt-1.5 text-[11px] leading-4 text-moti-navy-soft">
            This recommendation has not yet changed your Mastery Journey.
          </p>
        </Section>
      )}

      {usedSources.length > 0 && (
        <Section title="Supporting sources" Icon={IconSource}>
          <div className="flex flex-wrap gap-1.5">
            {usedSources.map((source) => (
              <button
                key={source.id}
                type="button"
                onClick={() => onPreviewSource(source)}
                className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-moti-line bg-moti-navy/[0.03] px-2.5 py-1 text-xs text-moti-navy-soft transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5 focus-visible:border-moti-navy/40"
              >
                <IconSource className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate font-medium text-moti-navy">
                  {source.documentTitle}
                </span>
                {source.sectionHeading && (
                  <>
                    <span aria-hidden>·</span>
                    <span className="truncate">{source.sectionHeading}</span>
                  </>
                )}
              </button>
            ))}
          </div>
        </Section>
      )}

      {result.memoryEchoPrompt && (
        <ChallengeMemoryEchoPreview prompt={result.memoryEchoPrompt} />
      )}

      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-moti-navy-soft">
          Recommended next: {NEXT_ACTION_LABEL[result.nextAction]}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          {canRetry && (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center gap-1.5 rounded-full border border-moti-navy/25 bg-moti-navy/[0.04] px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:border-moti-navy/40 hover:bg-moti-navy/10 focus-visible:border-moti-navy/50"
            >
              <IconRepeat className="h-3.5 w-3.5 text-moti-navy-soft" />
              Try again
            </button>
          )}
          {canRetry && !revealed && (
            <button
              type="button"
              onClick={onReveal}
              className="inline-flex items-center gap-1.5 rounded-full border border-moti-line bg-white px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5 focus-visible:border-moti-navy/40"
            >
              <IconLightbulb className="h-3.5 w-3.5 text-moti-navy-soft" />
              Reveal the answer
            </button>
          )}
          <button
            type="button"
            onClick={onTryAnother}
            className="inline-flex items-center gap-1.5 rounded-full border border-moti-line bg-white px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5 focus-visible:border-moti-navy/40"
          >
            <IconTarget className="h-3.5 w-3.5 text-moti-navy-soft" />
            Try another
          </button>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-1.5 rounded-full border border-moti-line bg-white px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5 focus-visible:border-moti-navy/40"
          >
            <IconBook className="h-3.5 w-3.5 text-moti-navy-soft" />
            Back to the conversation
          </button>
        </div>
        {canRetry && !revealed && (
          <p className="mt-1.5 text-[11px] leading-4 text-moti-navy-soft">
            Revealing the answer ends this challenge.
          </p>
        )}
      </div>
    </div>
  );
}
