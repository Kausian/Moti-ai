// Memory Echo scheduling and review, as pure time-injected functions.
//
// The intervals are lightweight prototype heuristics (see constants), not
// optimised spaced repetition, and every decision here is the learner's own
// self-report — no AI ever evaluates recall.

import type {
  MemoryEchoItem,
  MemoryEchoReviewDecision,
  PersistedMasteryStatus,
  SaveLearningOutcomeInput,
} from "@/lib/types";
import {
  INITIAL_REVIEW_DAYS,
  MAX_MEMORY_ECHO_PROMPT_LENGTH,
  MAX_SOURCE_IDS_PER_RECORD,
  MILLISECONDS_PER_DAY,
  NEXT_PRACTICE_DAYS,
} from "./constants";

export function addDays(from: Date, days: number): Date {
  return new Date(from.getTime() + days * MILLISECONDS_PER_DAY);
}

/** Weaker understanding comes back sooner. */
export function initialDueAt(mastery: PersistedMasteryStatus, now: Date): Date {
  return addDays(now, INITIAL_REVIEW_DAYS[mastery]);
}

export type MemoryEchoGroup = "due" | "later" | "completed";

/**
 * Classifies an item from timestamps against an injected `now`, so grouping is
 * deterministic and needs no timers to test.
 */
export function classifyMemoryEchoItem(
  item: MemoryEchoItem,
  now: Date,
): MemoryEchoGroup {
  if (item.status === "completed") return "completed";
  return new Date(item.dueAt).getTime() <= now.getTime() ? "due" : "later";
}

/** A prompt is storable only if it is non-empty and within the length cap. */
export function isValidMemoryEchoPrompt(prompt: string | undefined): boolean {
  if (typeof prompt !== "string") return false;
  const trimmed = prompt.trim();
  return trimmed.length > 0 && trimmed.length <= MAX_MEMORY_ECHO_PROMPT_LENGTH;
}

export interface UpsertMemoryEchoInput {
  /** The open (non-completed) item for this concept, if any. */
  existingOpen: MemoryEchoItem | null;
  conceptId: string;
  mastery: PersistedMasteryStatus;
  outcome: SaveLearningOutcomeInput;
  now: Date;
  itemId: string;
}

/**
 * Creates or updates the single open review item for a concept.
 *
 * There is at most one open item per concept: saving a concept repeatedly must
 * refresh the learner's review card, not bury them in duplicates. When updating,
 * the earliest due date wins — a concept already due for review should not be
 * pushed further away just because it was practised again.
 */
export function upsertMemoryEchoItem(
  input: UpsertMemoryEchoInput,
): MemoryEchoItem {
  const { existingOpen, conceptId, mastery, outcome, now, itemId } = input;
  const timestamp = now.toISOString();
  const prompt = (outcome.memoryEchoPrompt ?? "").trim();
  const sourceIds = outcome.sourceIds.slice(0, MAX_SOURCE_IDS_PER_RECORD);
  const proposedDueAt = initialDueAt(mastery, now);

  if (existingOpen) {
    const earliestDueAt =
      new Date(existingOpen.dueAt).getTime() <= proposedDueAt.getTime()
        ? existingOpen.dueAt
        : proposedDueAt.toISOString();

    return {
      ...existingOpen,
      // Newest valid prompt and freshest source labels win.
      prompt,
      dueAt: earliestDueAt,
      sourceIds,
      sourceDocumentTitle: outcome.sourceDocumentTitle,
      sectionHeading: outcome.sectionHeading ?? existingOpen.sectionHeading,
      conceptTitle: outcome.conceptTitle,
      updatedAt: timestamp,
    };
  }

  return {
    id: itemId,
    courseId: outcome.courseId,
    conceptId,
    conceptTitle: outcome.conceptTitle,
    prompt,
    status: "scheduled",
    dueAt: proposedDueAt.toISOString(),
    sourceIds,
    sourceDocumentTitle: outcome.sourceDocumentTitle,
    sectionHeading: outcome.sectionHeading,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

/**
 * Applies a learner-controlled review decision. These are self-reports, never
 * grades: "remembered" completes the item; the other two simply bring it back
 * tomorrow.
 */
export function applyReviewDecision(
  item: MemoryEchoItem,
  decision: MemoryEchoReviewDecision,
  now: Date,
): MemoryEchoItem {
  const timestamp = now.toISOString();

  if (decision === "remembered") {
    return {
      ...item,
      status: "completed",
      completedAt: timestamp,
      updatedAt: timestamp,
    };
  }

  // Both "needs more practice" and "review tomorrow" reopen for tomorrow; they
  // differ only in what they tell us about the concept (see the reducer).
  return {
    ...item,
    status: "scheduled",
    dueAt: addDays(now, NEXT_PRACTICE_DAYS).toISOString(),
    completedAt: undefined,
    updatedAt: timestamp,
  };
}
