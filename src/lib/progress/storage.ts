// The single place learning progress is read from / written to localStorage.
//
// Uses its own versioned key — deliberately NOT mixed into the course
// configuration object, so the two can evolve and be reset independently. Parsed
// data is fully validated before it is trusted, and malformed or outdated data
// falls back to an empty state rather than throwing.
//
// Nothing here logs the stored data.

import type {
  ConceptProgress,
  LearningProgressState,
  MasteryEvidence,
  MemoryEchoItem,
  PersistedMasteryStatus,
} from "@/lib/types";
import {
  LEARNING_PROGRESS_STORAGE_KEY,
  LEARNING_PROGRESS_VERSION,
} from "./constants";

export type ProgressSaveResult = { ok: true } | { ok: false; message: string };

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isString);
}

function isMastery(value: unknown): value is PersistedMasteryStatus {
  return value === "exploring" || value === "developing" || value === "understood";
}

function isActivityType(value: unknown): boolean {
  return value === "moti-mirror" || value === "micro-challenge";
}

function isEvidence(value: unknown): value is MasteryEvidence {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.activityId) &&
    isActivityType(value.activityType) &&
    isMastery(value.masteryRecommendation) &&
    isStringArray(value.sourceIds) &&
    isString(value.createdAt) &&
    (value.challengeOutcome === undefined ||
      value.challengeOutcome === "correct" ||
      value.challengeOutcome === "partially-correct" ||
      value.challengeOutcome === "incorrect") &&
    (value.attemptNumber === undefined || typeof value.attemptNumber === "number")
  );
}

function isConcept(value: unknown): value is ConceptProgress {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.courseId) &&
    isString(value.conceptTitle) &&
    isString(value.sourceDocumentId) &&
    isString(value.sourceDocumentTitle) &&
    (value.sectionHeading === undefined || isString(value.sectionHeading)) &&
    isMastery(value.masteryStatus) &&
    typeof value.needsReview === "boolean" &&
    typeof value.activityCount === "number" &&
    typeof value.successfulActivityCount === "number" &&
    isActivityType(value.lastActivityType) &&
    isString(value.lastActivityAt) &&
    isStringArray(value.sourceIds) &&
    Array.isArray(value.evidence) &&
    value.evidence.every(isEvidence)
  );
}

function isMemoryEchoItem(value: unknown): value is MemoryEchoItem {
  if (!isRecord(value)) return false;
  return (
    isString(value.id) &&
    isString(value.courseId) &&
    isString(value.conceptId) &&
    isString(value.conceptTitle) &&
    isString(value.prompt) &&
    (value.status === "scheduled" || value.status === "completed") &&
    isString(value.dueAt) &&
    isStringArray(value.sourceIds) &&
    isString(value.sourceDocumentTitle) &&
    (value.sectionHeading === undefined || isString(value.sectionHeading)) &&
    isString(value.createdAt) &&
    isString(value.updatedAt) &&
    (value.completedAt === undefined || isString(value.completedAt))
  );
}

export function isLearningProgressState(
  value: unknown,
): value is LearningProgressState {
  if (!isRecord(value)) return false;
  return (
    value.version === LEARNING_PROGRESS_VERSION &&
    Array.isArray(value.concepts) &&
    value.concepts.every(isConcept) &&
    Array.isArray(value.memoryEchoItems) &&
    value.memoryEchoItems.every(isMemoryEchoItem) &&
    isStringArray(value.processedActivityIds) &&
    isString(value.updatedAt)
  );
}

/**
 * Loads saved progress, or null when there is none / it cannot be trusted. A
 * malformed or outdated record returns null so the caller starts from an empty
 * state instead of crashing.
 */
export function loadLearningProgress(): LearningProgressState | null {
  if (typeof window === "undefined") return null;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(LEARNING_PROGRESS_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return isLearningProgressState(parsed) ? parsed : null;
}

export function saveLearningProgress(
  state: LearningProgressState,
): ProgressSaveResult {
  if (typeof window === "undefined") {
    return { ok: false, message: "Storage is unavailable in this environment." };
  }
  try {
    window.localStorage.setItem(
      LEARNING_PROGRESS_STORAGE_KEY,
      JSON.stringify(state),
    );
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "Couldn't save your progress to this browser. Storage may be full or blocked (for example, in private browsing).",
    };
  }
}
