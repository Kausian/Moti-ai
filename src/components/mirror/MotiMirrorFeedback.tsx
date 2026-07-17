"use client";

import type {
  ConversationSource,
  MasteryStatus,
  MotiMirrorMasteryRecommendation,
  MotiMirrorNextAction,
  MotiMirrorStructuredResponse,
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
import { MisconceptionItem } from "./MisconceptionItem";
import { MemoryEchoPreview } from "./MemoryEchoPreview";
import { SaveToJourney } from "@/components/learning/SaveToJourney";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import { buildMirrorOutcomeInput } from "@/lib/progress/outcome-input";

const NEXT_ACTION_LABEL: Record<MotiMirrorNextAction, string> = {
  "retry-teach-back": "Try explaining it again",
  "review-explanation": "Review the clearer explanation above",
  "give-example": "Ask Moti for an example",
  "continue-learning": "Continue learning",
};

interface MotiMirrorFeedbackProps {
  feedback: MotiMirrorStructuredResponse;
  /** The sources sent with the request, used to resolve validated ids to chips. */
  sources: ConversationSource[];
  /** Identifies this evaluation so saving stays idempotent. */
  activityId: string | null;
  onEdit: () => void;
  onGiveExample: () => void;
  onClose: () => void;
  onPreviewSource: (source: ConversationSource) => void;
}

/** Only the three real mastery states have a badge; not-evaluated is separate. */
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

// The Correct + Remember steps. Empty sections are hidden rather than padded
// with filler; the mastery recommendation is always labelled as a prototype
// recommendation that has not changed the Mastery Journey. All model text is
// rendered as plain text (React-escaped) — no Markdown or HTML is interpreted.
export function MotiMirrorFeedback({
  feedback,
  sources,
  activityId,
  onEdit,
  onGiveExample,
  onClose,
  onPreviewSource,
}: MotiMirrorFeedbackProps) {
  const { configuration } = useCourseConfiguration();
  const evaluated = feedback.responseMode === "teach-back-feedback";

  // Null for an unevaluated/blocked result or one with no validated source, which
  // is exactly when saving must not be offered.
  const outcome = activityId
    ? buildMirrorOutcomeInput({
        activityId,
        courseId: configuration.courseId,
        feedback,
        sources,
      })
    : null;
  const usedSources = feedback.usedSourceIds
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is ConversationSource => source !== undefined);

  return (
    <div className="space-y-4">
      <p className="break-words text-sm leading-6 text-moti-navy">
        {feedback.feedbackSummary}
      </p>

      {!evaluated && (
        <p className="rounded-lg border border-moti-line bg-moti-navy/[0.03] px-3 py-2 text-xs leading-5 text-moti-navy-soft">
          Moti did not evaluate this explanation, so no mastery recommendation is
          shown.
        </p>
      )}

      {evaluated && (
        <>
          {feedback.correctUnderstanding.length > 0 && (
            <Section title="What you understood" Icon={IconCheckCircle}>
              <ul className="space-y-1">
                {feedback.correctUnderstanding.map((item) => (
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

          {feedback.missingPoints.length > 0 && (
            <Section title="What is missing" Icon={IconTarget}>
              <ul className="space-y-1">
                {feedback.missingPoints.map((item) => (
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

          {feedback.misconceptions.length > 0 ? (
            <Section title="Misconceptions to correct" Icon={IconAlert}>
              <ul className="space-y-1.5">
                {feedback.misconceptions.map((misconception) => (
                  <MisconceptionItem
                    key={misconception.learnerIdea}
                    misconception={misconception}
                  />
                ))}
              </ul>
            </Section>
          ) : (
            <p className="flex items-center gap-1.5 text-xs leading-5 text-moti-understood">
              <IconCheckCircle className="h-3.5 w-3.5 shrink-0" />
              No material misconception detected.
            </p>
          )}
        </>
      )}

      {feedback.improvedExplanation.length > 0 && (
        <Section title="A clearer explanation" Icon={IconLightbulb}>
          <p className="break-words rounded-lg border border-moti-line bg-white p-2.5 text-sm leading-6 text-moti-navy">
            {feedback.improvedExplanation}
          </p>
        </Section>
      )}

      <Section title="Mastery recommendation" Icon={IconTarget}>
        <div className="flex flex-wrap items-center gap-2">
          {isMasteryStatus(feedback.masteryRecommendation) ? (
            <MasteryBadge status={feedback.masteryRecommendation} />
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-moti-line bg-moti-navy/5 px-2.5 py-1 text-xs font-medium text-moti-navy-soft">
              <IconAlert className="h-3.5 w-3.5" />
              Not evaluated
            </span>
          )}
        </div>
        {feedback.masteryRationale.length > 0 && (
          <p className="mt-1.5 break-words text-xs leading-5 text-moti-navy-soft">
            {feedback.masteryRationale}
          </p>
        )}
        <p className="mt-1.5 text-[11px] leading-4 text-moti-navy-soft">
          This is a prototype learning recommendation and has not yet changed your
          Mastery Journey.
        </p>
      </Section>

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

      {feedback.memoryEchoPrompt && (
        <MemoryEchoPreview prompt={feedback.memoryEchoPrompt} />
      )}

      <SaveToJourney outcome={outcome} />

      <div>
        <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-moti-navy-soft">
          Recommended next: {NEXT_ACTION_LABEL[feedback.nextAction]}
        </p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="inline-flex items-center gap-1.5 rounded-full border border-moti-line bg-white px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5 focus-visible:border-moti-navy/40"
          >
            <IconRepeat className="h-3.5 w-3.5 text-moti-navy-soft" />
            Try explaining again
          </button>
          <button
            type="button"
            onClick={onGiveExample}
            className="inline-flex items-center gap-1.5 rounded-full border border-moti-line bg-white px-2.5 py-1 text-xs font-medium text-moti-navy transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5 focus-visible:border-moti-navy/40"
          >
            <IconLightbulb className="h-3.5 w-3.5 text-moti-navy-soft" />
            Ask Moti for an example
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
      </div>
    </div>
  );
}
