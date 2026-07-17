// Pure, course-scoped views over the persisted progress state.
//
// Every selector filters by courseId: another course's progress stays stored but
// hidden while it is not the active course.

import type {
  ConceptProgress,
  LearningProgressState,
  MemoryEchoItem,
  PersistedMasteryStatus,
} from "@/lib/types";
import { classifyMemoryEchoItem } from "./memory-echo-policy";

export function conceptsForCourse(
  state: LearningProgressState,
  courseId: string,
): ConceptProgress[] {
  return state.concepts.filter((concept) => concept.courseId === courseId);
}

export function memoryEchoItemsForCourse(
  state: LearningProgressState,
  courseId: string,
): MemoryEchoItem[] {
  return state.memoryEchoItems.filter((item) => item.courseId === courseId);
}

export interface MasterySummary {
  exploring: number;
  developing: number;
  understood: number;
  needsReview: number;
  total: number;
}

/**
 * Counts by status. `needsReview` is counted independently of status, because a
 * concept flagged for review keeps its earned mastery — it is not demoted.
 */
export function masterySummary(concepts: ConceptProgress[]): MasterySummary {
  return {
    exploring: concepts.filter((c) => c.masteryStatus === "exploring").length,
    developing: concepts.filter((c) => c.masteryStatus === "developing").length,
    understood: concepts.filter((c) => c.masteryStatus === "understood").length,
    needsReview: concepts.filter((c) => c.needsReview).length,
    total: concepts.length,
  };
}

/** Concepts of one status, most recently practised first. */
export function conceptsByStatus(
  concepts: ConceptProgress[],
  status: PersistedMasteryStatus,
): ConceptProgress[] {
  return concepts
    .filter((concept) => concept.masteryStatus === status)
    .sort(
      (a, b) =>
        new Date(b.lastActivityAt).getTime() - new Date(a.lastActivityAt).getTime(),
    );
}

export interface GroupedMemoryEchoItems {
  due: MemoryEchoItem[];
  later: MemoryEchoItem[];
  completed: MemoryEchoItem[];
}

/**
 * Groups review items against an injected `now`. Due items surface the most
 * overdue first; later items surface the soonest first; completed items surface
 * the most recently completed first.
 */
export function groupMemoryEchoItems(
  items: MemoryEchoItem[],
  now: Date,
): GroupedMemoryEchoItems {
  const due: MemoryEchoItem[] = [];
  const later: MemoryEchoItem[] = [];
  const completed: MemoryEchoItem[] = [];

  for (const item of items) {
    const group = classifyMemoryEchoItem(item, now);
    if (group === "due") due.push(item);
    else if (group === "later") later.push(item);
    else completed.push(item);
  }

  const byDueAsc = (a: MemoryEchoItem, b: MemoryEchoItem) =>
    new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();

  return {
    due: [...due].sort(byDueAsc),
    later: [...later].sort(byDueAsc),
    completed: [...completed].sort(
      (a, b) =>
        new Date(b.completedAt ?? b.updatedAt).getTime() -
        new Date(a.completedAt ?? a.updatedAt).getTime(),
    ),
  };
}

/**
 * The next moment an item's grouping could change, so the UI can schedule a
 * single timer instead of one per item. Null when nothing is pending.
 */
export function nextDueBoundary(items: MemoryEchoItem[], now: Date): Date | null {
  const upcoming = items
    .filter((item) => item.status !== "completed")
    .map((item) => new Date(item.dueAt))
    .filter((dueAt) => dueAt.getTime() > now.getTime())
    .sort((a, b) => a.getTime() - b.getTime());
  return upcoming[0] ?? null;
}

/** True when a concept's original source document is no longer in the course. */
export function isSourceMissing(
  concept: ConceptProgress,
  documentIds: string[],
): boolean {
  return !documentIds.includes(concept.sourceDocumentId);
}
