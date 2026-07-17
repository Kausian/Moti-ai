// Validation shared by both challenge routes. Generation and evaluation have
// different contracts overall, but they bound sources and course context
// identically, so those rules live here once.

import type { ChallengeSourceInput, LearnerLevel } from "@/lib/types";
import {
  LEARNER_LEVELS,
  MAX_ASSISTANT_INSTRUCTIONS_LENGTH,
  MAX_SOURCE_CONTENT_LENGTH,
  MAX_SOURCES,
  MAX_TOTAL_SOURCE_CONTEXT,
} from "@/lib/chat/constants";
import { MIN_CHALLENGE_SOURCES } from "./constants";

export type Validated<T> = { ok: true; value: T } | { ok: false; reason: string };

export function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isLearnerLevel(value: unknown): value is LearnerLevel {
  return (LEARNER_LEVELS as readonly string[]).includes(value as string);
}

/** Bounded, deduplicated source excerpts. At least one is always required. */
export function validateChallengeSources(
  value: unknown,
): Validated<ChallengeSourceInput[]> {
  if (!Array.isArray(value)) return fail("Sources must be an array.");
  if (value.length < MIN_CHALLENGE_SOURCES) {
    return fail("A challenge requires at least one source.");
  }
  if (value.length > MAX_SOURCES) return fail("Too many sources.");

  const sources: ChallengeSourceInput[] = [];
  const seenIds = new Set<string>();
  let totalContent = 0;

  for (const item of value) {
    if (!isRecord(item)) return fail("Malformed source.");
    const { chunkId, documentId, documentTitle, sectionHeading, chunkIndex, content } =
      item;

    if (typeof chunkId !== "string" || chunkId.trim().length === 0) {
      return fail("Source is missing a valid id.");
    }
    if (seenIds.has(chunkId)) return fail("Duplicate source id.");
    seenIds.add(chunkId);

    if (typeof documentId !== "string" || documentId.trim().length === 0) {
      return fail("Source is missing a document id.");
    }
    if (typeof documentTitle !== "string" || documentTitle.trim().length === 0) {
      return fail("Source is missing a document title.");
    }
    if (sectionHeading !== undefined && typeof sectionHeading !== "string") {
      return fail("Malformed source section heading.");
    }
    if (
      typeof chunkIndex !== "number" ||
      !Number.isInteger(chunkIndex) ||
      chunkIndex < 0
    ) {
      return fail("Malformed source chunk index.");
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      return fail("Source content is required.");
    }
    if (content.length > MAX_SOURCE_CONTENT_LENGTH) {
      return fail("Source content is too long.");
    }

    totalContent += content.length;
    if (totalContent > MAX_TOTAL_SOURCE_CONTEXT) {
      return fail("Combined source context is too large.");
    }

    sources.push({
      chunkId,
      documentId,
      documentTitle,
      sectionHeading: sectionHeading?.trim() || undefined,
      chunkIndex,
      content,
    });
  }
  return { ok: true, value: sources };
}

/** The minimal course context an evaluation needs (level + coaching style). */
export function validateEvaluationCourse(
  value: unknown,
): Validated<{ learnerLevel: LearnerLevel; assistantInstructions: string }> {
  if (!isRecord(value)) return fail("Course configuration is required.");
  if (!isLearnerLevel(value.learnerLevel)) return fail("Unsupported learner level.");
  if (typeof value.assistantInstructions !== "string") {
    return fail("Assistant instructions must be a string.");
  }
  const assistantInstructions = value.assistantInstructions.trim();
  if (assistantInstructions.length > MAX_ASSISTANT_INSTRUCTIONS_LENGTH) {
    return fail("Assistant instructions are too long.");
  }
  return { ok: true, value: { learnerLevel: value.learnerLevel, assistantInstructions } };
}
