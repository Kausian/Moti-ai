// Manual, dependency-free runtime validation of the untrusted
// /api/challenge/generate body. Returns a fully-typed request or a single safe
// error reason (no internals or stack traces are exposed to the client).
//
// The shape is deliberately closed: only the fields of GenerateChallengeRequest
// are ever read, so a client cannot smuggle conversation history, documents, or
// extra instructions into the generation prompt.

import type {
  GenerateChallengeRequest,
  MotiChallengeDifficulty,
  MotiChallengeType,
} from "@/lib/types";
import {
  MAX_ASSISTANT_INSTRUCTIONS_LENGTH,
  MAX_COURSE_TITLE_LENGTH,
  MAX_OBJECTIVE_LENGTH,
} from "@/lib/chat/constants";
import {
  CHALLENGE_DIFFICULTIES,
  CHALLENGE_TYPES,
  MAX_CHALLENGE_CONCEPT_LENGTH,
} from "./constants";
import {
  fail,
  isLearnerLevel,
  isRecord,
  validateChallengeSources,
  type Validated,
} from "./request-parts";

function isChallengeType(value: unknown): value is MotiChallengeType {
  return (CHALLENGE_TYPES as readonly string[]).includes(value as string);
}

function isDifficulty(value: unknown): value is MotiChallengeDifficulty {
  return (CHALLENGE_DIFFICULTIES as readonly string[]).includes(value as string);
}

function validateCourse(
  value: unknown,
): Validated<GenerateChallengeRequest["course"]> {
  if (!isRecord(value)) return fail("Course configuration is required.");

  const { title, learnerLevel, learningObjective, assistantInstructions } = value;
  if (typeof title !== "string") return fail("Course title must be a string.");
  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0) return fail("Course title is required.");
  if (trimmedTitle.length > MAX_COURSE_TITLE_LENGTH) {
    return fail("Course title is too long.");
  }

  if (!isLearnerLevel(learnerLevel)) return fail("Unsupported learner level.");

  if (typeof learningObjective !== "string") {
    return fail("Learning objective must be a string.");
  }
  const objective = learningObjective.trim();
  if (objective.length > MAX_OBJECTIVE_LENGTH) {
    return fail("Learning objective is too long.");
  }

  if (typeof assistantInstructions !== "string") {
    return fail("Assistant instructions must be a string.");
  }
  const instructions = assistantInstructions.trim();
  if (instructions.length > MAX_ASSISTANT_INSTRUCTIONS_LENGTH) {
    return fail("Assistant instructions are too long.");
  }

  return {
    ok: true,
    value: {
      title: trimmedTitle,
      learnerLevel,
      learningObjective: objective,
      assistantInstructions: instructions,
    },
  };
}

export type ValidateGenerationRequestResult = Validated<GenerateChallengeRequest>;

export function validateGenerationRequest(
  body: unknown,
): ValidateGenerationRequestResult {
  if (!isRecord(body)) return fail("Request body must be a JSON object.");

  if (typeof body.conceptTitle !== "string") {
    return fail("Concept title must be a string.");
  }
  const conceptTitle = body.conceptTitle.trim();
  if (conceptTitle.length === 0) return fail("Concept title is required.");
  if (conceptTitle.length > MAX_CHALLENGE_CONCEPT_LENGTH) {
    return fail("Concept title is too long.");
  }

  if (body.requestedType !== "auto" && !isChallengeType(body.requestedType)) {
    return fail("Unsupported challenge type.");
  }
  const requestedType = body.requestedType;

  if (!isDifficulty(body.difficulty)) return fail("Unsupported difficulty.");
  const difficulty = body.difficulty;

  const course = validateCourse(body.course);
  if (!course.ok) return course;

  const sources = validateChallengeSources(body.sources);
  if (!sources.ok) return sources;

  return {
    ok: true,
    value: {
      conceptTitle,
      requestedType,
      difficulty,
      course: course.value,
      sources: sources.value,
    },
  };
}
