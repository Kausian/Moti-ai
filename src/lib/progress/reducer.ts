// The learning-progress state machine: pure, deterministic, and time-injected.
//
// Every mutation returns either the next state or a bounded, user-facing reason,
// so the caller can report a storage-limit honestly instead of silently dropping
// the learner's newest work.

import type {
  ConceptProgress,
  LearningProgressState,
  MemoryEchoItem,
  MemoryEchoReviewDecision,
  SaveLearningOutcomeInput,
} from "@/lib/types";
import {
  LEARNING_PROGRESS_VERSION,
  MAX_CONCEPTS_PER_COURSE,
  MAX_MEMORY_ECHO_ITEMS_PER_COURSE,
} from "./constants";
import { buildConceptId } from "./concept-id";
import { applyOutcomeToConcept, toPersistedMastery } from "./mastery-policy";
import {
  applyReviewDecision,
  isValidMemoryEchoPrompt,
  upsertMemoryEchoItem,
} from "./memory-echo-policy";
import { validateLearningOutcome } from "./validation";

export function emptyProgressState(now: Date): LearningProgressState {
  return {
    version: LEARNING_PROGRESS_VERSION,
    concepts: [],
    memoryEchoItems: [],
    processedActivityIds: [],
    updatedAt: now.toISOString(),
  };
}

export type ProgressMutation =
  | { ok: true; state: LearningProgressState; alreadySaved?: boolean }
  | { ok: false; reason: string };

export interface SaveOutcomeContext {
  now: Date;
  /** Injected id factories keep the reducer pure and tests deterministic. */
  newEvidenceId: () => string;
  newMemoryEchoItemId: () => string;
}

/**
 * Saves one validated outcome: updates (or creates) the concept, upserts its open
 * Memory Echo item, and records the activity id — atomically, so a partial save
 * can never happen.
 *
 * Idempotent by design: an activity id already in `processedActivityIds` returns
 * the state untouched with `alreadySaved`, so pressing Save twice changes nothing.
 */
export function saveOutcome(
  state: LearningProgressState,
  input: SaveLearningOutcomeInput,
  context: SaveOutcomeContext,
): ProgressMutation {
  const validated = validateLearningOutcome(input);
  if (!validated.ok) return { ok: false, reason: validated.reason };
  const outcome = validated.value;

  if (state.processedActivityIds.includes(outcome.activityId)) {
    return { ok: true, state, alreadySaved: true };
  }

  const mastery = toPersistedMastery(outcome.masteryRecommendation);
  if (mastery === null) {
    return { ok: false, reason: "This result was not evaluated, so there is nothing to save." };
  }

  const conceptId = buildConceptId({
    courseId: outcome.courseId,
    sourceDocumentId: outcome.sourceDocumentId,
    sectionHeading: outcome.sectionHeading,
    conceptTitle: outcome.conceptTitle,
  });
  if (conceptId === null) {
    return { ok: false, reason: "This concept could not be identified from its source." };
  }

  const existing = state.concepts.find((concept) => concept.id === conceptId) ?? null;

  const courseConceptCount = state.concepts.filter(
    (concept) => concept.courseId === outcome.courseId,
  ).length;
  if (!existing && courseConceptCount >= MAX_CONCEPTS_PER_COURSE) {
    return {
      ok: false,
      reason: `This prototype stores up to ${MAX_CONCEPTS_PER_COURSE} concepts per course. Reset your learning progress to save more.`,
    };
  }

  const updatedConcept = applyOutcomeToConcept({
    existing,
    conceptId,
    outcome,
    mastery,
    now: context.now,
    evidenceId: context.newEvidenceId(),
  });

  const concepts = existing
    ? state.concepts.map((concept) =>
        concept.id === conceptId ? updatedConcept : concept,
      )
    : [...state.concepts, updatedConcept];

  let memoryEchoItems = state.memoryEchoItems;
  if (isValidMemoryEchoPrompt(outcome.memoryEchoPrompt)) {
    const existingOpen =
      state.memoryEchoItems.find(
        (item) => item.conceptId === conceptId && item.status !== "completed",
      ) ?? null;

    const courseItemCount = state.memoryEchoItems.filter(
      (item) => item.courseId === outcome.courseId,
    ).length;
    if (!existingOpen && courseItemCount >= MAX_MEMORY_ECHO_ITEMS_PER_COURSE) {
      return {
        ok: false,
        reason: `This prototype stores up to ${MAX_MEMORY_ECHO_ITEMS_PER_COURSE} review items per course. Complete or remove some to save more.`,
      };
    }

    const item = upsertMemoryEchoItem({
      existingOpen,
      conceptId,
      mastery,
      outcome,
      now: context.now,
      itemId: context.newMemoryEchoItemId(),
    });
    memoryEchoItems = existingOpen
      ? state.memoryEchoItems.map((existingItem) =>
          existingItem.id === item.id ? item : existingItem,
        )
      : [...state.memoryEchoItems, item];
  }

  return {
    ok: true,
    state: {
      ...state,
      concepts,
      memoryEchoItems,
      processedActivityIds: [...state.processedActivityIds, outcome.activityId],
      updatedAt: context.now.toISOString(),
    },
  };
}

/**
 * Applies a learner's review decision to an item, and reflects it on the concept:
 * remembering clears `needsReview`; needing practice sets it. "Review tomorrow" is
 * a pure postponement and deliberately says nothing about understanding.
 */
export function reviewMemoryEchoItem(
  state: LearningProgressState,
  itemId: string,
  decision: MemoryEchoReviewDecision,
  now: Date,
): ProgressMutation {
  const item = state.memoryEchoItems.find((candidate) => candidate.id === itemId);
  if (!item) return { ok: false, reason: "That review item no longer exists." };

  const updatedItem = applyReviewDecision(item, decision, now);

  const concepts: ConceptProgress[] = state.concepts.map((concept) => {
    if (concept.id !== item.conceptId) return concept;
    if (decision === "remembered") return { ...concept, needsReview: false };
    if (decision === "needs-practice") return { ...concept, needsReview: true };
    return concept;
  });

  return {
    ok: true,
    state: {
      ...state,
      concepts,
      memoryEchoItems: state.memoryEchoItems.map((candidate) =>
        candidate.id === itemId ? updatedItem : candidate,
      ),
      updatedAt: now.toISOString(),
    },
  };
}

/** Reschedules an item without any self-assessment. */
export function rescheduleMemoryEchoItem(
  state: LearningProgressState,
  itemId: string,
  dueAt: Date,
  now: Date,
): ProgressMutation {
  const item = state.memoryEchoItems.find((candidate) => candidate.id === itemId);
  if (!item) return { ok: false, reason: "That review item no longer exists." };

  const updatedItem: MemoryEchoItem = {
    ...item,
    status: "scheduled",
    dueAt: dueAt.toISOString(),
    completedAt: undefined,
    updatedAt: now.toISOString(),
  };

  return {
    ok: true,
    state: {
      ...state,
      memoryEchoItems: state.memoryEchoItems.map((candidate) =>
        candidate.id === itemId ? updatedItem : candidate,
      ),
      updatedAt: now.toISOString(),
    },
  };
}

/** Removes one review item. The concept and its evidence are untouched. */
export function removeMemoryEchoItem(
  state: LearningProgressState,
  itemId: string,
  now: Date,
): ProgressMutation {
  const exists = state.memoryEchoItems.some((item) => item.id === itemId);
  if (!exists) return { ok: false, reason: "That review item no longer exists." };

  return {
    ok: true,
    state: {
      ...state,
      memoryEchoItems: state.memoryEchoItems.filter((item) => item.id !== itemId),
      updatedAt: now.toISOString(),
    },
  };
}

/**
 * Clears progress for one course only. Another course's concepts, review items,
 * and activity ledger survive untouched — resetting the course you are studying
 * must never wipe a course you are not.
 */
export function resetCourseProgress(
  state: LearningProgressState,
  courseId: string,
  now: Date,
): LearningProgressState {
  const removedActivityIds = new Set(
    state.concepts
      .filter((concept) => concept.courseId === courseId)
      .flatMap((concept) => concept.evidence.map((evidence) => evidence.activityId)),
  );

  return {
    ...state,
    concepts: state.concepts.filter((concept) => concept.courseId !== courseId),
    memoryEchoItems: state.memoryEchoItems.filter(
      (item) => item.courseId !== courseId,
    ),
    // Drop only this course's activity ids so its work can be saved again.
    processedActivityIds: state.processedActivityIds.filter(
      (id) => !removedActivityIds.has(id),
    ),
    updatedAt: now.toISOString(),
  };
}
