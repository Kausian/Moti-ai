// Builds the minimal save payload from an already-validated Mirror or Challenge
// result.
//
// This is the single place activity results become persistable progress, and it
// is where the privacy boundary is enforced in practice: it reads only the
// mastery recommendation, outcome, attempt, source metadata, and the review
// prompt. The learner's explanation, their written challenge answer, and the full
// AI feedback are never referenced, so they cannot reach storage by accident.

import type {
  ChallengeEvaluationResult,
  ConversationSource,
  GeneratedMotiChallenge,
  MotiMirrorStructuredResponse,
  SaveLearningOutcomeInput,
} from "@/lib/types";

/** The activity id for one challenge attempt: stable, derived, never random. */
export function challengeActivityId(
  challengeId: string,
  attemptNumber: number,
): string {
  return `${challengeId}:attempt:${attemptNumber}`;
}

function sourceMetadata(sources: ConversationSource[], usedSourceIds: string[]) {
  // Prefer the sources the result actually cited; fall back to the ones supplied.
  const cited = usedSourceIds
    .map((id) => sources.find((source) => source.id === id))
    .filter((source): source is ConversationSource => source !== undefined);
  const effective = cited.length > 0 ? cited : sources;
  const primary = effective[0];
  if (!primary) return null;

  return {
    sourceDocumentId: primary.documentId,
    sourceDocumentTitle: primary.documentTitle,
    sectionHeading: primary.sectionHeading,
    sourceIds: effective.map((source) => source.id),
  };
}

/**
 * Builds the save payload for a Moti Mirror result. Returns null when the result
 * is not saveable (unevaluated, or with no validated source).
 */
export function buildMirrorOutcomeInput(input: {
  activityId: string;
  courseId: string;
  feedback: MotiMirrorStructuredResponse;
  sources: ConversationSource[];
}): SaveLearningOutcomeInput | null {
  const { activityId, courseId, feedback, sources } = input;
  if (feedback.responseMode !== "teach-back-feedback") return null;
  if (feedback.masteryRecommendation === "not-evaluated") return null;

  const metadata = sourceMetadata(sources, feedback.usedSourceIds);
  if (!metadata) return null;

  return {
    activityId,
    activityType: "moti-mirror",
    courseId,
    conceptTitle: feedback.conceptTitle,
    ...metadata,
    masteryRecommendation: feedback.masteryRecommendation,
    memoryEchoPrompt: feedback.memoryEchoPrompt,
  };
}

/**
 * Builds the save payload for a micro-challenge result. Returns null when the
 * result is not saveable (unevaluated, or with no validated source).
 */
export function buildChallengeOutcomeInput(input: {
  courseId: string;
  challenge: GeneratedMotiChallenge;
  result: ChallengeEvaluationResult;
  attemptNumber: number;
  sources: ConversationSource[];
}): SaveLearningOutcomeInput | null {
  const { courseId, challenge, result, attemptNumber, sources } = input;
  if (result.masteryRecommendation === "not-evaluated") return null;
  if (result.outcome === "not-evaluated") return null;

  const metadata = sourceMetadata(sources, result.usedSourceIds);
  if (!metadata) return null;

  return {
    activityId: challengeActivityId(challenge.challengeId, attemptNumber),
    activityType: "micro-challenge",
    courseId,
    conceptTitle: challenge.conceptTitle,
    ...metadata,
    masteryRecommendation: result.masteryRecommendation,
    challengeOutcome: result.outcome,
    attemptNumber,
    memoryEchoPrompt: result.memoryEchoPrompt,
  };
}
