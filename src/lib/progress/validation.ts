// Validation for a learning outcome before it is persisted.
//
// This is both a correctness gate and the privacy gate: `SaveLearningOutcomeInput`
// structurally cannot carry learner free text or full AI feedback, and everything
// that *is* present is bounded here before it reaches localStorage.

import type { SaveLearningOutcomeInput } from "@/lib/types";
import {
  MAX_MEMORY_ECHO_PROMPT_LENGTH,
  MAX_SOURCE_IDS_PER_RECORD,
} from "./constants";
import { toPersistedMastery } from "./mastery-policy";

export type ValidationResult =
  | { ok: true; value: SaveLearningOutcomeInput }
  | { ok: false; reason: string };

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

/**
 * Validates and normalizes an outcome. Rejects anything that must never become
 * progress: an unevaluated result, a missing activity id, or a result with no
 * validated source to ground it.
 */
export function validateLearningOutcome(
  input: SaveLearningOutcomeInput,
): ValidationResult {
  const activityId = input.activityId.trim();
  if (activityId.length === 0) return fail("An activity id is required.");

  const courseId = input.courseId.trim();
  if (courseId.length === 0) return fail("A course id is required.");

  const conceptTitle = input.conceptTitle.trim();
  if (conceptTitle.length === 0) return fail("A concept title is required.");

  const sourceDocumentId = input.sourceDocumentId.trim();
  if (sourceDocumentId.length === 0) return fail("A source document is required.");

  const sourceDocumentTitle = input.sourceDocumentTitle.trim();
  if (sourceDocumentTitle.length === 0) {
    return fail("A source document title is required.");
  }

  // Never persist an unevaluated result: there is no mastery to record.
  if (toPersistedMastery(input.masteryRecommendation) === null) {
    return fail("This result was not evaluated, so there is nothing to save.");
  }

  // A challenge that could not be marked is likewise not evidence.
  if (input.challengeOutcome === "not-evaluated") {
    return fail("This challenge was not evaluated, so there is nothing to save.");
  }

  const sourceIds = [...new Set(input.sourceIds.map((id) => id.trim()))].filter(
    (id) => id.length > 0,
  );
  if (sourceIds.length === 0) {
    return fail("A validated source is required to save progress.");
  }

  if (
    input.attemptNumber !== undefined &&
    (!Number.isInteger(input.attemptNumber) || input.attemptNumber < 1)
  ) {
    return fail("The attempt number is invalid.");
  }

  const prompt = input.memoryEchoPrompt?.trim();
  if (prompt !== undefined && prompt.length > MAX_MEMORY_ECHO_PROMPT_LENGTH) {
    return fail("The review prompt is too long to save.");
  }

  return {
    ok: true,
    value: {
      activityId,
      activityType: input.activityType,
      courseId,
      conceptTitle,
      sourceDocumentId,
      sourceDocumentTitle,
      sectionHeading: input.sectionHeading?.trim() || undefined,
      sourceIds: sourceIds.slice(0, MAX_SOURCE_IDS_PER_RECORD),
      masteryRecommendation: input.masteryRecommendation,
      challengeOutcome: input.challengeOutcome,
      attemptNumber: input.attemptNumber,
      memoryEchoPrompt: prompt && prompt.length > 0 ? prompt : undefined,
    },
  };
}
