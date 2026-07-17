// Runtime validation of a generated challenge.
//
// Used twice, deliberately:
//   1. on the model's JSON at generation time (structured output is not trusted);
//   2. on the challenge object the browser sends back at evaluation time
//      (client-held challenge state is not trusted either).
//
// Source-id policy matches the rest of the app: unknown ids are REMOVED, so an
// invented id can never reach the UI. Over-long strings and malformed structures
// are REJECTED rather than truncated.
//
// The challengeId is always supplied by the server (crypto.randomUUID) and is
// never read from the model.

import type {
  ChallengeOption,
  GeneratedMotiChallenge,
  MotiChallengeDifficulty,
  MotiChallengeType,
} from "@/lib/types";
import {
  CHALLENGE_DIFFICULTIES,
  CHALLENGE_TYPES,
  CHOICE_OPTION_COUNT,
  MAX_CHALLENGE_CONCEPT_LENGTH,
  MAX_CHALLENGE_HINT_LENGTH,
  MAX_CHALLENGE_INSTRUCTIONS_LENGTH,
  MAX_CHALLENGE_OPTION_LENGTH,
  MAX_CHALLENGE_PROMPT_LENGTH,
  MAX_CHALLENGE_USED_SOURCE_IDS,
  MAX_ESSENTIAL_POINT_LENGTH,
  MAX_ESSENTIAL_POINTS,
  MAX_REFERENCE_ANSWER_LENGTH,
  MAX_REFERENCE_EXPLANATION_LENGTH,
} from "./constants";
import { fail, isRecord, type Validated } from "./request-parts";

const CHOICE_TYPES: readonly MotiChallengeType[] = ["multiple-choice", "scenario"];

function isChallengeType(value: unknown): value is MotiChallengeType {
  return (CHALLENGE_TYPES as readonly string[]).includes(value as string);
}

function isDifficulty(value: unknown): value is MotiChallengeDifficulty {
  return (CHALLENGE_DIFFICULTIES as readonly string[]).includes(value as string);
}

export function isChoiceChallenge(
  challenge: GeneratedMotiChallenge,
): challenge is Extract<GeneratedMotiChallenge, { options: ChallengeOption[] }> {
  return (CHOICE_TYPES as readonly string[]).includes(challenge.challengeType);
}

function boundedString(
  value: unknown,
  max: number,
  field: string,
): Validated<string> {
  if (typeof value !== "string") return fail(`missing-${field}`);
  const trimmed = value.trim();
  if (trimmed.length === 0) return fail(`empty-${field}`);
  if (trimmed.length > max) return fail(`${field}-too-long`);
  return { ok: true, value: trimmed };
}

function validateOptions(value: unknown): Validated<ChallengeOption[]> {
  if (!Array.isArray(value)) return fail("missing-options");
  if (value.length !== CHOICE_OPTION_COUNT) return fail("options-must-be-exactly-four");

  const options: ChallengeOption[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!isRecord(item)) return fail("malformed-option");
    if (typeof item.id !== "string" || item.id.trim().length === 0) {
      return fail("malformed-option-id");
    }
    const id = item.id.trim();
    if (seen.has(id)) return fail("duplicate-option-id");
    seen.add(id);

    const text = boundedString(item.text, MAX_CHALLENGE_OPTION_LENGTH, "option-text");
    if (!text.ok) return text;

    options.push({ id, text: text.value });
  }
  return { ok: true, value: options };
}

function validateEssentialPoints(value: unknown): Validated<string[]> {
  if (!Array.isArray(value)) return fail("missing-essential-points");
  if (value.length > MAX_ESSENTIAL_POINTS) return fail("too-many-essential-points");

  const points: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return fail("malformed-essential-point");
    const trimmed = item.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length > MAX_ESSENTIAL_POINT_LENGTH) {
      return fail("essential-point-too-long");
    }
    points.push(trimmed);
  }
  return { ok: true, value: points };
}

function selectSourceIds(value: unknown, supplied: Set<string>): Validated<string[]> {
  if (!Array.isArray(value)) return fail("missing-used-source-ids");
  const ids = [
    ...new Set(value.filter((id): id is string => typeof id === "string")),
  ]
    .filter((id) => supplied.has(id))
    .slice(0, MAX_CHALLENGE_USED_SOURCE_IDS);
  return { ok: true, value: ids };
}

/**
 * Validates the body of a challenge (everything except its id) against the ids
 * that were actually supplied to the generator.
 */
function validateChallengeBody(
  object: Record<string, unknown>,
  suppliedSourceIds: string[],
  challengeId: string,
): Validated<GeneratedMotiChallenge> {
  if (!isChallengeType(object.challengeType)) return fail("invalid-challenge-type");
  const challengeType = object.challengeType;

  if (!isDifficulty(object.difficulty)) return fail("invalid-difficulty");
  const difficulty = object.difficulty;

  const conceptTitle = boundedString(
    object.conceptTitle,
    MAX_CHALLENGE_CONCEPT_LENGTH,
    "concept-title",
  );
  if (!conceptTitle.ok) return conceptTitle;

  const prompt = boundedString(object.prompt, MAX_CHALLENGE_PROMPT_LENGTH, "prompt");
  if (!prompt.ok) return prompt;

  const instructions = boundedString(
    object.instructions,
    MAX_CHALLENGE_INSTRUCTIONS_LENGTH,
    "instructions",
  );
  if (!instructions.ok) return instructions;

  const hint = boundedString(object.hint, MAX_CHALLENGE_HINT_LENGTH, "hint");
  if (!hint.ok) return hint;

  const usedSourceIds = selectSourceIds(
    object.usedSourceIds,
    new Set(suppliedSourceIds),
  );
  if (!usedSourceIds.ok) return usedSourceIds;

  const base = {
    challengeId,
    conceptTitle: conceptTitle.value,
    difficulty,
    prompt: prompt.value,
    instructions: instructions.value,
    hint: hint.value,
    usedSourceIds: usedSourceIds.value,
  };

  if ((CHOICE_TYPES as readonly string[]).includes(challengeType)) {
    const options = validateOptions(object.options);
    if (!options.ok) return options;

    if (typeof object.correctOptionId !== "string") {
      return fail("missing-correct-option-id");
    }
    const correctOptionId = object.correctOptionId.trim();
    // The key must name exactly one of the presented options.
    if (!options.value.some((option) => option.id === correctOptionId)) {
      return fail("correct-option-id-does-not-match-an-option");
    }

    const referenceExplanation = boundedString(
      object.referenceExplanation,
      MAX_REFERENCE_EXPLANATION_LENGTH,
      "reference-explanation",
    );
    if (!referenceExplanation.ok) return referenceExplanation;

    return {
      ok: true,
      value: {
        ...base,
        challengeType: challengeType as "multiple-choice" | "scenario",
        options: options.value,
        correctOptionId,
        referenceExplanation: referenceExplanation.value,
      },
    };
  }

  const referenceAnswer = boundedString(
    object.referenceAnswer,
    MAX_REFERENCE_ANSWER_LENGTH,
    "reference-answer",
  );
  if (!referenceAnswer.ok) return referenceAnswer;

  const essentialPoints = validateEssentialPoints(object.essentialPoints);
  if (!essentialPoints.ok) return essentialPoints;

  return {
    ok: true,
    value: {
      ...base,
      challengeType: challengeType as "correct-the-mistake" | "explain-in-own-words",
      referenceAnswer: referenceAnswer.value,
      essentialPoints: essentialPoints.value,
    },
  };
}

/**
 * Validates the model's generated JSON. The `challengeId` is supplied by the
 * server — any id the model invents is ignored.
 */
export function validateGeneratedChallenge(
  rawText: string | undefined,
  suppliedSourceIds: string[],
  challengeId: string,
): Validated<GeneratedMotiChallenge> {
  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    return fail("empty-output");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return fail("malformed-json");
  }
  if (!isRecord(parsed)) return fail("not-an-object");

  return validateChallengeBody(parsed, suppliedSourceIds, challengeId);
}

/**
 * Re-validates a challenge object sent back by the browser for evaluation.
 * Client-held challenge state is untrusted, so the whole object is checked again
 * (including that its id is a plain non-empty string).
 */
export function validateChallengeObject(
  value: unknown,
  suppliedSourceIds: string[],
): Validated<GeneratedMotiChallenge> {
  if (!isRecord(value)) return fail("malformed-challenge");
  if (typeof value.challengeId !== "string" || value.challengeId.trim().length === 0) {
    return fail("missing-challenge-id");
  }
  return validateChallengeBody(value, suppliedSourceIds, value.challengeId.trim());
}
