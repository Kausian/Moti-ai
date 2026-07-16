// Runtime validation of the model's returned JSON. Structured-output mode is not
// trusted on its own — every field is checked, unknown/duplicate source ids and
// invalid suggested actions are removed, and malformed output is rejected.

import type {
  MotiResponseMode,
  MotiStructuredResponse,
  SuggestedLearningAction,
} from "@/lib/types";
import {
  MAX_ANSWER_LENGTH,
  MAX_FOLLOW_UP_LENGTH,
  MAX_SUGGESTED_ACTIONS,
  MAX_USED_SOURCE_IDS,
} from "./constants";

const VALID_MODES: readonly MotiResponseMode[] = [
  "grounded-answer",
  "clarifying-question",
  "insufficient-knowledge",
  "blocked",
];

const VALID_ACTIONS: readonly SuggestedLearningAction[] = [
  "explain-simply",
  "give-example",
  "show-source",
  "ask-follow-up",
];

export type ValidateAiResponseResult =
  | { ok: true; value: MotiStructuredResponse }
  | { ok: false; reason: string };

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function stringArrayOf(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

function dedupe(values: string[]): string[] {
  return [...new Set(values)];
}

export function validateAiResponse(
  rawText: string | undefined,
  suppliedSourceIds: string[],
): ValidateAiResponseResult {
  if (typeof rawText !== "string" || rawText.trim().length === 0) {
    return fail("empty-output");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return fail("malformed-json");
  }
  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    return fail("not-an-object");
  }
  const object = parsed as Record<string, unknown>;

  if (!VALID_MODES.includes(object.responseMode as MotiResponseMode)) {
    return fail("invalid-response-mode");
  }
  const responseMode = object.responseMode as MotiResponseMode;

  if (typeof object.answer !== "string") return fail("missing-answer");
  const answer = object.answer.trim();
  if (answer.length === 0) return fail("empty-answer");
  if (answer.length > MAX_ANSWER_LENGTH) return fail("answer-too-long");

  if (typeof object.knowledgeSufficient !== "boolean") {
    return fail("missing-knowledge-flag");
  }
  const knowledgeSufficient = object.knowledgeSufficient;

  if (!Array.isArray(object.usedSourceIds)) return fail("missing-used-source-ids");
  if (!Array.isArray(object.suggestedActions)) return fail("missing-suggested-actions");

  const supplied = new Set(suppliedSourceIds);
  const usedSourceIds = dedupe(stringArrayOf(object.usedSourceIds))
    .filter((id) => supplied.has(id))
    .slice(0, MAX_USED_SOURCE_IDS);

  const suggestedActions = dedupe(stringArrayOf(object.suggestedActions))
    .filter((action): action is SuggestedLearningAction =>
      (VALID_ACTIONS as readonly string[]).includes(action),
    )
    .slice(0, MAX_SUGGESTED_ACTIONS);

  let followUpQuestion: string | undefined;
  if (object.followUpQuestion !== undefined) {
    if (typeof object.followUpQuestion !== "string") return fail("invalid-follow-up");
    const trimmed = object.followUpQuestion.trim().slice(0, MAX_FOLLOW_UP_LENGTH);
    followUpQuestion = trimmed.length > 0 ? trimmed : undefined;
  }

  return {
    ok: true,
    value: {
      responseMode,
      answer,
      knowledgeSufficient,
      // When knowledge is insufficient, no sources back the answer.
      usedSourceIds: knowledgeSufficient ? usedSourceIds : [],
      suggestedActions,
      followUpQuestion,
    },
  };
}
