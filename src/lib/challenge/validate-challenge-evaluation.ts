// Runtime validation of the model's free-response marking. Structured output is
// not trusted on its own — every field is re-checked, unknown/duplicate source
// ids are removed, and over-long or over-sized output is rejected.
//
// The model supplies the *evaluative content* only. `masteryRecommendation` and
// `nextAction` are applied afterwards by `applyAttemptPolicy`, so a model can
// never award mastery or hand out an extra retry.

import type { ChallengeOutcome } from "@/lib/types";
import {
  MAX_CHALLENGE_CORRECTION_LENGTH,
  MAX_CHALLENGE_EXPLANATION_LENGTH,
  MAX_CHALLENGE_FEEDBACK_LENGTH,
  MAX_CHALLENGE_LIST_ITEM_LENGTH,
  MAX_CHALLENGE_LIST_ITEMS,
  MAX_CHALLENGE_MEMORY_ECHO_LENGTH,
  MAX_CHALLENGE_USED_SOURCE_IDS,
} from "./constants";
import { fail, isRecord, type Validated } from "./request-parts";

const VALID_OUTCOMES: readonly ChallengeOutcome[] = [
  "correct",
  "partially-correct",
  "incorrect",
  "not-evaluated",
];

/** The evaluative content the model is responsible for. */
export interface ChallengeEvaluationContent {
  outcome: ChallengeOutcome;
  feedback: string;
  correctUnderstanding: string[];
  missingPoints: string[];
  correction?: string;
  explanation: string;
  usedSourceIds: string[];
  memoryEchoPrompt?: string;
}

function validateStringList(
  value: unknown,
  field: string,
): Validated<string[]> {
  if (!Array.isArray(value)) return fail(`missing-${field}`);
  if (value.length > MAX_CHALLENGE_LIST_ITEMS) return fail(`${field}-too-many-items`);

  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return fail(`${field}-item-not-a-string`);
    const trimmed = item.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length > MAX_CHALLENGE_LIST_ITEM_LENGTH) {
      return fail(`${field}-item-too-long`);
    }
    items.push(trimmed);
  }
  return { ok: true, value: items };
}

export function validateChallengeEvaluation(
  rawText: string | undefined,
  suppliedSourceIds: string[],
): Validated<ChallengeEvaluationContent> {
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
  const object = parsed;

  if (!VALID_OUTCOMES.includes(object.outcome as ChallengeOutcome)) {
    return fail("invalid-outcome");
  }
  const outcome = object.outcome as ChallengeOutcome;

  if (typeof object.feedback !== "string") return fail("missing-feedback");
  const feedback = object.feedback.trim();
  if (feedback.length === 0) return fail("empty-feedback");
  if (feedback.length > MAX_CHALLENGE_FEEDBACK_LENGTH) return fail("feedback-too-long");

  const correctUnderstanding = validateStringList(
    object.correctUnderstanding,
    "correctUnderstanding",
  );
  if (!correctUnderstanding.ok) return correctUnderstanding;

  const missingPoints = validateStringList(object.missingPoints, "missingPoints");
  if (!missingPoints.ok) return missingPoints;

  if (typeof object.explanation !== "string") return fail("missing-explanation");
  const explanation = object.explanation.trim();
  if (explanation.length > MAX_CHALLENGE_EXPLANATION_LENGTH) {
    return fail("explanation-too-long");
  }

  let correction: string | undefined;
  if (object.correction !== undefined && object.correction !== null) {
    if (typeof object.correction !== "string") return fail("invalid-correction");
    const trimmed = object.correction.trim();
    if (trimmed.length > MAX_CHALLENGE_CORRECTION_LENGTH) {
      return fail("correction-too-long");
    }
    correction = trimmed.length > 0 ? trimmed : undefined;
  }

  if (!Array.isArray(object.usedSourceIds)) return fail("missing-used-source-ids");
  const supplied = new Set(suppliedSourceIds);
  const usedSourceIds = [
    ...new Set(object.usedSourceIds.filter((id): id is string => typeof id === "string")),
  ]
    .filter((id) => supplied.has(id))
    .slice(0, MAX_CHALLENGE_USED_SOURCE_IDS);

  let memoryEchoPrompt: string | undefined;
  if (object.memoryEchoPrompt !== undefined && object.memoryEchoPrompt !== null) {
    if (typeof object.memoryEchoPrompt !== "string") {
      return fail("invalid-memory-echo-prompt");
    }
    const trimmed = object.memoryEchoPrompt.trim();
    if (trimmed.length > MAX_CHALLENGE_MEMORY_ECHO_LENGTH) {
      return fail("memory-echo-prompt-too-long");
    }
    memoryEchoPrompt = trimmed.length > 0 ? trimmed : undefined;
  }

  // A marked answer must be explainable; only an unevaluated one may be bare.
  if (outcome !== "not-evaluated" && explanation.length === 0) {
    return fail("marked-answer-requires-an-explanation");
  }
  // An unevaluated answer may never carry coaching detail or cited sources.
  if (outcome === "not-evaluated") {
    return {
      ok: true,
      value: {
        outcome,
        feedback,
        correctUnderstanding: [],
        missingPoints: [],
        explanation: "",
        usedSourceIds: [],
        memoryEchoPrompt: undefined,
      },
    };
  }

  return {
    ok: true,
    value: {
      outcome,
      feedback,
      correctUnderstanding: correctUnderstanding.value,
      missingPoints: missingPoints.value,
      correction,
      explanation,
      usedSourceIds,
      memoryEchoPrompt,
    },
  };
}
