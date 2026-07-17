// Manual, dependency-free runtime validation of the untrusted
// /api/challenge/evaluate body.
//
// The challenge object itself is re-validated here: the browser holds it between
// generation and evaluation, so it must be treated as untrusted input rather
// than trusted state.

import type { EvaluateChallengeRequest } from "@/lib/types";
import {
  MAX_CHALLENGE_ATTEMPTS,
  MAX_WRITTEN_ANSWER_LENGTH,
  MIN_WRITTEN_ANSWER_LENGTH,
} from "./constants";
import {
  fail,
  isRecord,
  validateChallengeSources,
  validateEvaluationCourse,
  type Validated,
} from "./request-parts";
import {
  isChoiceChallenge,
  validateChallengeObject,
} from "./validate-generated-challenge";

export type ValidateEvaluationRequestResult = Validated<EvaluateChallengeRequest>;

export function validateEvaluationRequest(
  body: unknown,
): ValidateEvaluationRequestResult {
  if (!isRecord(body)) return fail("Request body must be a JSON object.");

  const sources = validateChallengeSources(body.sources);
  if (!sources.ok) return sources;

  // The challenge is re-validated against the same source ids that back it.
  const challenge = validateChallengeObject(
    body.challenge,
    sources.value.map((source) => source.chunkId),
  );
  if (!challenge.ok) return challenge;

  if (
    typeof body.attemptNumber !== "number" ||
    !Number.isInteger(body.attemptNumber) ||
    body.attemptNumber < 1
  ) {
    return fail("Invalid attempt number.");
  }
  if (body.attemptNumber > MAX_CHALLENGE_ATTEMPTS) {
    return fail("No attempts remain for this challenge.");
  }
  const attemptNumber = body.attemptNumber;

  const course = validateEvaluationCourse(body.course);
  if (!course.ok) return course;

  if (!isRecord(body.learnerResponse)) return fail("A learner response is required.");
  const { selectedOptionId, writtenAnswer } = body.learnerResponse;

  if (isChoiceChallenge(challenge.value)) {
    if (typeof selectedOptionId !== "string" || selectedOptionId.trim().length === 0) {
      return fail("Select an option before submitting.");
    }
    const selected = selectedOptionId.trim();
    // The selection must name one of the options actually presented.
    if (!challenge.value.options.some((option) => option.id === selected)) {
      return fail("The selected option does not exist.");
    }
    return {
      ok: true,
      value: {
        challenge: challenge.value,
        learnerResponse: { selectedOptionId: selected },
        attemptNumber,
        course: course.value,
        sources: sources.value,
      },
    };
  }

  if (typeof writtenAnswer !== "string") return fail("A written answer is required.");
  const answer = writtenAnswer.trim();
  if (answer.length < MIN_WRITTEN_ANSWER_LENGTH) {
    return fail("Your answer is too short to evaluate.");
  }
  if (answer.length > MAX_WRITTEN_ANSWER_LENGTH) {
    return fail("Your answer is too long.");
  }

  return {
    ok: true,
    value: {
      challenge: challenge.value,
      learnerResponse: { writtenAnswer: answer },
      attemptNumber,
      course: course.value,
      sources: sources.value,
    },
  };
}
