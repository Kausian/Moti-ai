// Runtime validation of the model's returned teach-back JSON. Structured-output
// mode is not trusted on its own — every field is checked, unknown/duplicate
// source ids are removed, over-long or over-sized output is rejected, and the
// cross-field consistency rules for each response mode are enforced.
//
// Source-id policy: unknown ids are REMOVED (never rejected outright), matching
// lib/ai/validate-ai-response. An invented id therefore can never reach the UI.
// Array/string limits are REJECTED rather than truncated, so we never silently
// present half of a coaching point.

import type {
  MotiMirrorMasteryRecommendation,
  MotiMirrorMisconception,
  MotiMirrorNextAction,
  MotiMirrorResponseMode,
  MotiMirrorStructuredResponse,
} from "@/lib/types";
import {
  MAX_CONCEPT_TITLE_LENGTH,
  MAX_CORRECT_UNDERSTANDING_ITEMS,
  MAX_FEEDBACK_SUMMARY_LENGTH,
  MAX_IMPROVED_EXPLANATION_LENGTH,
  MAX_LIST_ITEM_LENGTH,
  MAX_MASTERY_RATIONALE_LENGTH,
  MAX_MEMORY_ECHO_PROMPT_LENGTH,
  MAX_MISCONCEPTION_FIELD_LENGTH,
  MAX_MISCONCEPTIONS,
  MAX_MISSING_POINT_ITEMS,
  MAX_MIRROR_USED_SOURCE_IDS,
} from "./constants";

const VALID_MODES: readonly MotiMirrorResponseMode[] = [
  "teach-back-feedback",
  "insufficient-knowledge",
  "blocked",
];

const VALID_MASTERY: readonly MotiMirrorMasteryRecommendation[] = [
  "not-evaluated",
  "exploring",
  "developing",
  "understood",
];

const VALID_NEXT_ACTIONS: readonly MotiMirrorNextAction[] = [
  "retry-teach-back",
  "review-explanation",
  "give-example",
  "continue-learning",
];

export type ValidateMirrorResponseResult =
  | { ok: true; value: MotiMirrorStructuredResponse }
  | { ok: false; reason: string };

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

/**
 * Validates a list of short coaching strings. Empty entries are dropped; an
 * over-long entry or an over-long list is rejected rather than truncated.
 */
function validateStringList(
  value: unknown,
  maxItems: number,
  field: string,
): { ok: true; value: string[] } | { ok: false; reason: string } {
  if (!Array.isArray(value)) return fail(`missing-${field}`);
  if (value.length > maxItems) return fail(`${field}-too-many-items`);

  const items: string[] = [];
  for (const item of value) {
    if (typeof item !== "string") return fail(`${field}-item-not-a-string`);
    const trimmed = item.trim();
    if (trimmed.length === 0) continue;
    if (trimmed.length > MAX_LIST_ITEM_LENGTH) return fail(`${field}-item-too-long`);
    items.push(trimmed);
  }
  return { ok: true, value: items };
}

function validateMisconceptions(
  value: unknown,
): { ok: true; value: MotiMirrorMisconception[] } | { ok: false; reason: string } {
  if (!Array.isArray(value)) return fail("missing-misconceptions");
  if (value.length > MAX_MISCONCEPTIONS) return fail("misconceptions-too-many-items");

  const items: MotiMirrorMisconception[] = [];
  for (const item of value) {
    if (!isRecord(item)) return fail("malformed-misconception");
    const { learnerIdea, correction } = item;
    if (typeof learnerIdea !== "string" || typeof correction !== "string") {
      return fail("malformed-misconception");
    }
    const idea = learnerIdea.trim();
    const fix = correction.trim();
    // A misconception is only meaningful with both halves present.
    if (idea.length === 0 || fix.length === 0) return fail("incomplete-misconception");
    if (
      idea.length > MAX_MISCONCEPTION_FIELD_LENGTH ||
      fix.length > MAX_MISCONCEPTION_FIELD_LENGTH
    ) {
      return fail("misconception-field-too-long");
    }
    items.push({ learnerIdea: idea, correction: fix });
  }
  return { ok: true, value: items };
}

export function validateMirrorResponse(
  rawText: string | undefined,
  suppliedSourceIds: string[],
): ValidateMirrorResponseResult {
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

  if (!VALID_MODES.includes(object.responseMode as MotiMirrorResponseMode)) {
    return fail("invalid-response-mode");
  }
  const responseMode = object.responseMode as MotiMirrorResponseMode;

  if (typeof object.conceptTitle !== "string") return fail("missing-concept-title");
  const conceptTitle = object.conceptTitle.trim();
  if (conceptTitle.length === 0) return fail("empty-concept-title");
  if (conceptTitle.length > MAX_CONCEPT_TITLE_LENGTH) {
    return fail("concept-title-too-long");
  }

  if (typeof object.knowledgeSufficient !== "boolean") {
    return fail("missing-knowledge-flag");
  }
  const knowledgeSufficient = object.knowledgeSufficient;

  if (typeof object.feedbackSummary !== "string") return fail("missing-feedback-summary");
  const feedbackSummary = object.feedbackSummary.trim();
  if (feedbackSummary.length === 0) return fail("empty-feedback-summary");
  if (feedbackSummary.length > MAX_FEEDBACK_SUMMARY_LENGTH) {
    return fail("feedback-summary-too-long");
  }

  const correct = validateStringList(
    object.correctUnderstanding,
    MAX_CORRECT_UNDERSTANDING_ITEMS,
    "correctUnderstanding",
  );
  if (!correct.ok) return correct;

  const missing = validateStringList(
    object.missingPoints,
    MAX_MISSING_POINT_ITEMS,
    "missingPoints",
  );
  if (!missing.ok) return missing;

  const misconceptions = validateMisconceptions(object.misconceptions);
  if (!misconceptions.ok) return misconceptions;

  if (typeof object.improvedExplanation !== "string") {
    return fail("missing-improved-explanation");
  }
  const improvedExplanation = object.improvedExplanation.trim();
  if (improvedExplanation.length > MAX_IMPROVED_EXPLANATION_LENGTH) {
    return fail("improved-explanation-too-long");
  }

  if (!VALID_MASTERY.includes(object.masteryRecommendation as MotiMirrorMasteryRecommendation)) {
    return fail("invalid-mastery-recommendation");
  }
  const masteryRecommendation =
    object.masteryRecommendation as MotiMirrorMasteryRecommendation;

  if (typeof object.masteryRationale !== "string") return fail("missing-mastery-rationale");
  const masteryRationale = object.masteryRationale.trim();
  if (masteryRationale.length > MAX_MASTERY_RATIONALE_LENGTH) {
    return fail("mastery-rationale-too-long");
  }

  if (!VALID_NEXT_ACTIONS.includes(object.nextAction as MotiMirrorNextAction)) {
    return fail("invalid-next-action");
  }
  const nextAction = object.nextAction as MotiMirrorNextAction;

  if (!Array.isArray(object.usedSourceIds)) return fail("missing-used-source-ids");
  const supplied = new Set(suppliedSourceIds);
  const usedSourceIds = dedupe(
    object.usedSourceIds.filter((id): id is string => typeof id === "string"),
  )
    .filter((id) => supplied.has(id))
    .slice(0, MAX_MIRROR_USED_SOURCE_IDS);

  let memoryEchoPrompt: string | undefined;
  if (object.memoryEchoPrompt !== undefined && object.memoryEchoPrompt !== null) {
    if (typeof object.memoryEchoPrompt !== "string") return fail("invalid-memory-echo-prompt");
    const trimmed = object.memoryEchoPrompt.trim();
    if (trimmed.length > MAX_MEMORY_ECHO_PROMPT_LENGTH) {
      return fail("memory-echo-prompt-too-long");
    }
    memoryEchoPrompt = trimmed.length > 0 ? trimmed : undefined;
  }

  // --- Cross-field consistency, enforced per response mode ------------------

  if (responseMode === "teach-back-feedback") {
    if (!knowledgeSufficient) return fail("feedback-requires-sufficient-knowledge");
    if (masteryRecommendation === "not-evaluated") {
      return fail("feedback-requires-a-mastery-recommendation");
    }
    if (improvedExplanation.length === 0) {
      return fail("feedback-requires-an-improved-explanation");
    }
  } else {
    // insufficient-knowledge and blocked may never carry a learner evaluation.
    if (masteryRecommendation !== "not-evaluated") {
      return fail("unevaluated-mode-must-not-recommend-mastery");
    }
    if (responseMode === "insufficient-knowledge" && knowledgeSufficient) {
      return fail("insufficient-knowledge-must-not-claim-sufficiency");
    }
  }

  return {
    ok: true,
    value: {
      responseMode,
      conceptTitle,
      knowledgeSufficient,
      feedbackSummary,
      // Only an actual evaluation may present coaching detail.
      correctUnderstanding: responseMode === "teach-back-feedback" ? correct.value : [],
      missingPoints: responseMode === "teach-back-feedback" ? missing.value : [],
      misconceptions:
        responseMode === "teach-back-feedback" ? misconceptions.value : [],
      improvedExplanation,
      masteryRecommendation,
      masteryRationale,
      // Sources may only back a real evaluation.
      usedSourceIds: responseMode === "teach-back-feedback" ? usedSourceIds : [],
      nextAction,
      memoryEchoPrompt,
    },
  };
}
