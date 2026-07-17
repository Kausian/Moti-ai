"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import type {
  MemoryEchoItem,
  MemoryEchoReviewDecision,
  PersistedMasteryStatus,
} from "@/lib/types";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import { useLearningProgress } from "@/hooks/useLearningProgress";
import {
  conceptsByStatus,
  isSourceMissing,
  masterySummary,
  nextDueBoundary,
} from "@/lib/progress/selectors";
import { addDays } from "@/lib/progress/memory-echo-policy";
import { NEXT_PRACTICE_DAYS } from "@/lib/progress/constants";
import {
  getClockSnapshot,
  getServerClockSnapshot,
  subscribeClock,
  tickClock,
} from "@/lib/progress/clock-store";
import { MasteryBadge } from "@/components/ui/MasteryBadge";
import { IconAlert } from "@/components/ui/icons";
import { MemoryEcho } from "./MemoryEcho";
import { MemoryEchoReview } from "./MemoryEchoReview";
import { ConceptProgressCard } from "./ConceptProgressCard";
import { MasterySummary } from "./MasterySummary";
import { LearningProgressEmptyState } from "./LearningProgressEmptyState";
import { ResetLearningProgress } from "./ResetLearningProgress";

const MASTERY_GROUPS: PersistedMasteryStatus[] = [
  "exploring",
  "developing",
  "understood",
];

interface JourneyPanelProps {
  /** Lets Moti listen while the learner types a recall note. */
  onReviewTypingChange?: (typing: boolean) => void;
}

// The real Mastery Journey, derived entirely from persisted progress. Nothing is
// mocked or seeded: an empty course shows an honest empty state.
export function JourneyPanel({ onReviewTypingChange }: JourneyPanelProps) {
  const { configuration } = useCourseConfiguration();
  const {
    concepts,
    memoryEchoItems,
    storageError,
    reviewItem,
    rescheduleItem,
    removeItem,
    resetCurrentCourse,
  } = useLearningProgress();

  const [reviewing, setReviewing] = useState<MemoryEchoItem | null>(null);
  const [status, setStatus] = useState<string>("");

  // One shared clock drives every "due now" boundary — never a timer per item.
  // It reads the epoch during SSR and the real time once mounted, so grouping is
  // hydration-safe.
  const nowMs = useSyncExternalStore(
    subscribeClock,
    getClockSnapshot,
    getServerClockSnapshot,
  );
  const now = useMemo(() => new Date(nowMs), [nowMs]);

  const boundary = useMemo(
    () => nextDueBoundary(memoryEchoItems, now),
    [memoryEchoItems, now],
  );

  useEffect(() => {
    if (!boundary) return;
    const delay = boundary.getTime() - Date.now();
    if (delay <= 0) return;
    // A single timer for the next boundary only; it re-arms when items change.
    const id = setTimeout(tickClock, delay + 500);
    return () => clearTimeout(id);
  }, [boundary]);

  const summary = useMemo(() => masterySummary(concepts), [concepts]);
  const documentIds = useMemo(
    () => configuration.documents.map((document) => document.id),
    [configuration.documents],
  );

  const handleDecision = useCallback(
    (decision: MemoryEchoReviewDecision) => {
      if (!reviewing) return;
      const result = reviewItem(reviewing.id, decision);
      setReviewing(null);
      tickClock();
      setStatus(
        result.ok
          ? decision === "remembered"
            ? "Review marked as remembered. Saved locally."
            : "Review scheduled for tomorrow. Saved locally."
          : result.reason,
      );
    },
    [reviewing, reviewItem],
  );

  const handleReschedule = useCallback(
    (item: MemoryEchoItem) => {
      const result = rescheduleItem(item.id, addDays(new Date(), NEXT_PRACTICE_DAYS));
      tickClock();
      setStatus(
        result.ok ? "Review scheduled for tomorrow. Saved locally." : result.reason,
      );
    },
    [rescheduleItem],
  );

  const handleRemove = useCallback(
    (item: MemoryEchoItem) => {
      const result = removeItem(item.id);
      setStatus(result.ok ? "Review item removed." : result.reason);
    },
    [removeItem],
  );

  const handleReset = useCallback(() => {
    const result = resetCurrentCourse();
    setStatus(
      result.ok
        ? `Learning progress for ${configuration.courseTitle} was reset.`
        : result.reason,
    );
  }, [resetCurrentCourse, configuration.courseTitle]);

  return (
    <aside aria-label="Mastery Journey and review" className="flex flex-col gap-3">
      <section className="rounded-2xl border border-moti-line bg-moti-surface p-4 shadow-sm">
        <h2 className="text-sm font-semibold text-moti-navy">Mastery Journey</h2>
        <p className="mt-0.5 text-xs text-moti-navy-soft">
          Saved from your own activities — no points or streaks, just progress.
        </p>

        {/* One polite region for save / review / reset outcomes. */}
        <p aria-live="polite" className="sr-only">
          {status}
        </p>

        {storageError && (
          <p
            role="alert"
            className="mt-2 flex items-start gap-1.5 rounded-lg border border-moti-danger/25 bg-moti-danger-bg px-2.5 py-1.5 text-[11px] leading-4 text-moti-danger"
          >
            <IconAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            {storageError}
          </p>
        )}

        {concepts.length === 0 ? (
          <div className="mt-3">
            <LearningProgressEmptyState />
          </div>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            <MasterySummary summary={summary} />

            {MASTERY_GROUPS.map((groupStatus) => {
              const grouped = conceptsByStatus(concepts, groupStatus);
              if (grouped.length === 0) return null;
              return (
                <div key={groupStatus}>
                  <div className="mb-1.5 flex items-center gap-2">
                    <MasteryBadge status={groupStatus} />
                    <span className="text-xs text-moti-navy-soft">
                      {grouped.length} concept{grouped.length === 1 ? "" : "s"}
                    </span>
                  </div>
                  <ul className="flex flex-col gap-1.5">
                    {grouped.map((concept) => (
                      <ConceptProgressCard
                        key={concept.id}
                        concept={concept}
                        sourceMissing={isSourceMissing(concept, documentIds)}
                        now={now}
                      />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}

        {concepts.length > 0 && (
          <div className="mt-4 flex flex-col border-t border-moti-line pt-3">
            <ResetLearningProgress
              courseTitle={configuration.courseTitle}
              conceptCount={concepts.length}
              reviewCount={memoryEchoItems.length}
              onReset={handleReset}
            />
          </div>
        )}
      </section>

      <MemoryEcho
        items={memoryEchoItems}
        now={now}
        onPractise={setReviewing}
        onReschedule={handleReschedule}
        onRemove={handleRemove}
      />

      {reviewing && (
        <MemoryEchoReview
          item={reviewing}
          onDecision={handleDecision}
          onClose={() => setReviewing(null)}
          onTypingChange={onReviewTypingChange}
        />
      )}
    </aside>
  );
}
