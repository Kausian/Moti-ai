// The mastery update policy: pure, deterministic, and time-injected.
//
// This is a CONSERVATIVE PROTOTYPE HEURISTIC, not a scientifically optimised
// model of learning. Its central rule is deliberate:
//
//   A weaker later result never downgrades a concept.
//
// One weak attempt is poor evidence against a previously demonstrated stronger
// one — a learner can misread a question, rush, or stumble on phrasing. Silently
// demoting them would punish the very practice we want to encourage. Instead the
// concept keeps its status and is flagged `needsReview`, which is honest ("this
// looked shaky, come back to it") without erasing earned progress. A later
// equal-or-stronger success clears the flag.

import type {
  ConceptProgress,
  LearningActivityType,
  MasteryEvidence,
  MotiMirrorMasteryRecommendation,
  PersistedMasteryStatus,
  SaveLearningOutcomeInput,
} from "@/lib/types";
import { MAX_EVIDENCE_PER_CONCEPT } from "./constants";

/** Exploring < Developing < Understood. */
const MASTERY_RANK: Record<PersistedMasteryStatus, number> = {
  exploring: 1,
  developing: 2,
  understood: 3,
};

export function masteryRank(status: PersistedMasteryStatus): number {
  return MASTERY_RANK[status];
}

/** True when `next` represents at least as much understanding as `current`. */
export function isAtLeastAsStrong(
  next: PersistedMasteryStatus,
  current: PersistedMasteryStatus,
): boolean {
  return masteryRank(next) >= masteryRank(current);
}

/** Narrows a recommendation to a persistable status; `not-evaluated` never persists. */
export function toPersistedMastery(
  recommendation: MotiMirrorMasteryRecommendation,
): PersistedMasteryStatus | null {
  return recommendation === "not-evaluated" ? null : recommendation;
}

/**
 * A result counts as "successful" evidence when the learner demonstrated the
 * concept: an `understood` teach-back, or a correct challenge answer.
 */
export function isSuccessfulOutcome(input: SaveLearningOutcomeInput): boolean {
  if (input.activityType === "micro-challenge") {
    return input.challengeOutcome === "correct";
  }
  return input.masteryRecommendation === "understood";
}

/** Keeps only the most recent evidence, newest last. */
export function trimEvidence(evidence: MasteryEvidence[]): MasteryEvidence[] {
  return evidence.slice(-MAX_EVIDENCE_PER_CONCEPT);
}

export interface ApplyOutcomeInput {
  /** The concept as it stands, or null when this is its first evidence. */
  existing: ConceptProgress | null;
  conceptId: string;
  outcome: SaveLearningOutcomeInput;
  mastery: PersistedMasteryStatus;
  /** Injected so results are deterministic and testable. */
  now: Date;
  evidenceId: string;
}

/**
 * Applies one validated outcome to a concept, returning the updated concept.
 *
 * Callers must have already rejected duplicates (see the reducer's
 * `processedActivityIds` ledger) — this function assumes the activity is new, so
 * counts always advance exactly once per unique activity.
 */
export function applyOutcomeToConcept(input: ApplyOutcomeInput): ConceptProgress {
  const { existing, conceptId, outcome, mastery, now, evidenceId } = input;
  const timestamp = now.toISOString();
  const successful = isSuccessfulOutcome(outcome);

  const evidence: MasteryEvidence = {
    id: evidenceId,
    activityId: outcome.activityId,
    activityType: outcome.activityType,
    masteryRecommendation: mastery,
    challengeOutcome:
      outcome.challengeOutcome && outcome.challengeOutcome !== "not-evaluated"
        ? outcome.challengeOutcome
        : undefined,
    attemptNumber: outcome.attemptNumber,
    sourceIds: outcome.sourceIds,
    createdAt: timestamp,
  };

  if (!existing) {
    return {
      id: conceptId,
      courseId: outcome.courseId,
      conceptTitle: outcome.conceptTitle,
      sourceDocumentId: outcome.sourceDocumentId,
      sourceDocumentTitle: outcome.sourceDocumentTitle,
      sectionHeading: outcome.sectionHeading,
      masteryStatus: mastery,
      // A first result is the best evidence we have; nothing to revisit yet.
      needsReview: false,
      activityCount: 1,
      successfulActivityCount: successful ? 1 : 0,
      lastActivityType: outcome.activityType,
      lastActivityAt: timestamp,
      sourceIds: outcome.sourceIds,
      evidence: [evidence],
    };
  }

  const stronger = masteryRank(mastery) > masteryRank(existing.masteryStatus);
  const weaker = masteryRank(mastery) < masteryRank(existing.masteryStatus);

  // Never downgrade: a weaker result flags a revisit instead.
  const masteryStatus = stronger ? mastery : existing.masteryStatus;

  let needsReview = existing.needsReview;
  if (weaker) {
    needsReview = true;
  } else if (successful) {
    // An equal-or-stronger success shows the concept is solid again.
    needsReview = false;
  }

  return {
    ...existing,
    // Refresh display metadata from the newest activity.
    conceptTitle: outcome.conceptTitle,
    sourceDocumentTitle: outcome.sourceDocumentTitle,
    sectionHeading: outcome.sectionHeading ?? existing.sectionHeading,
    masteryStatus,
    needsReview,
    activityCount: existing.activityCount + 1,
    successfulActivityCount:
      existing.successfulActivityCount + (successful ? 1 : 0),
    lastActivityType: outcome.activityType,
    lastActivityAt: timestamp,
    sourceIds: outcome.sourceIds,
    evidence: trimEvidence([...existing.evidence, evidence]),
  };
}

/** Convenience for display code that needs the last activity's label. */
export function activityLabel(type: LearningActivityType): string {
  return type === "moti-mirror" ? "Moti Mirror" : "Micro-challenge";
}
