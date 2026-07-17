import { describe, expect, it } from "vitest";
import type {
  ConceptProgress,
  LearningProgressState,
  MemoryEchoItem,
} from "@/lib/types";
import {
  conceptsByStatus,
  conceptsForCourse,
  groupMemoryEchoItems,
  isSourceMissing,
  masterySummary,
  memoryEchoItemsForCourse,
  nextDueBoundary,
} from "./selectors";
import { addDays } from "./memory-echo-policy";
import { emptyProgressState } from "./reducer";

const NOW = new Date("2025-06-01T12:00:00.000Z");

function concept(overrides: Partial<ConceptProgress> = {}): ConceptProgress {
  return {
    id: "course-1:doc-1:a",
    courseId: "course-1",
    conceptTitle: "A",
    sourceDocumentId: "doc-1",
    sourceDocumentTitle: "Guide",
    masteryStatus: "developing",
    needsReview: false,
    activityCount: 1,
    successfulActivityCount: 0,
    lastActivityType: "moti-mirror",
    lastActivityAt: NOW.toISOString(),
    sourceIds: ["doc-1:chunk:0"],
    evidence: [],
    ...overrides,
  };
}

function item(overrides: Partial<MemoryEchoItem> = {}): MemoryEchoItem {
  return {
    id: "echo-1",
    courseId: "course-1",
    conceptId: "course-1:doc-1:a",
    conceptTitle: "A",
    prompt: "Recall it.",
    status: "scheduled",
    dueAt: addDays(NOW, 1).toISOString(),
    sourceIds: [],
    sourceDocumentTitle: "Guide",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

function state(overrides: Partial<LearningProgressState> = {}): LearningProgressState {
  return { ...emptyProgressState(NOW), ...overrides };
}

describe("course scoping", () => {
  it("returns only the current course's concepts, keeping others stored", () => {
    const full = state({
      concepts: [
        concept({ id: "c1" }),
        concept({ id: "c2", courseId: "course-2" }),
      ],
    });

    const scoped = conceptsForCourse(full, "course-1");
    expect(scoped).toHaveLength(1);
    expect(scoped[0].id).toBe("c1");
    // The other course is hidden, not deleted.
    expect(full.concepts).toHaveLength(2);
  });

  it("returns only the current course's review items", () => {
    const full = state({
      memoryEchoItems: [item({ id: "e1" }), item({ id: "e2", courseId: "course-2" })],
    });
    const scoped = memoryEchoItemsForCourse(full, "course-1");
    expect(scoped).toHaveLength(1);
    expect(scoped[0].id).toBe("e1");
  });
});

describe("masterySummary", () => {
  it("counts each status and total", () => {
    const summary = masterySummary([
      concept({ id: "1", masteryStatus: "exploring" }),
      concept({ id: "2", masteryStatus: "developing" }),
      concept({ id: "3", masteryStatus: "understood" }),
      concept({ id: "4", masteryStatus: "understood" }),
    ]);
    expect(summary).toEqual({
      exploring: 1,
      developing: 1,
      understood: 2,
      needsReview: 0,
      total: 4,
    });
  });

  it("counts needsReview independently of status", () => {
    const flagged = concept({ masteryStatus: "understood", needsReview: true });
    const summary = masterySummary([flagged]);

    // The concept keeps its earned mastery AND appears as needing review.
    expect(summary.understood).toBe(1);
    expect(summary.needsReview).toBe(1);
    expect(conceptsByStatus([flagged], "understood")).toHaveLength(1);
    expect(conceptsByStatus([flagged], "developing")).toHaveLength(0);
  });
});

describe("conceptsByStatus", () => {
  it("returns the most recently practised first", () => {
    const older = concept({ id: "old", lastActivityAt: addDays(NOW, -3).toISOString() });
    const newer = concept({ id: "new", lastActivityAt: NOW.toISOString() });
    expect(conceptsByStatus([older, newer], "developing").map((c) => c.id)).toEqual([
      "new",
      "old",
    ]);
  });
});

describe("groupMemoryEchoItems", () => {
  it("groups due, later, and completed predictably", () => {
    const overdue = item({ id: "overdue", dueAt: addDays(NOW, -2).toISOString() });
    const dueNow = item({ id: "due", dueAt: addDays(NOW, -1).toISOString() });
    const soon = item({ id: "soon", dueAt: addDays(NOW, 1).toISOString() });
    const distant = item({ id: "distant", dueAt: addDays(NOW, 5).toISOString() });
    const done = item({
      id: "done",
      status: "completed",
      completedAt: NOW.toISOString(),
    });

    const grouped = groupMemoryEchoItems([distant, done, overdue, soon, dueNow], NOW);

    // Most overdue first, soonest-upcoming first.
    expect(grouped.due.map((i) => i.id)).toEqual(["overdue", "due"]);
    expect(grouped.later.map((i) => i.id)).toEqual(["soon", "distant"]);
    expect(grouped.completed.map((i) => i.id)).toEqual(["done"]);
  });

  it("sorts completed items most recently completed first", () => {
    const older = item({
      id: "older",
      status: "completed",
      completedAt: addDays(NOW, -5).toISOString(),
    });
    const newer = item({
      id: "newer",
      status: "completed",
      completedAt: NOW.toISOString(),
    });
    expect(
      groupMemoryEchoItems([older, newer], NOW).completed.map((i) => i.id),
    ).toEqual(["newer", "older"]);
  });
});

describe("nextDueBoundary", () => {
  it("returns the soonest future due time so one timer suffices", () => {
    const boundary = nextDueBoundary(
      [
        item({ id: "a", dueAt: addDays(NOW, 5).toISOString() }),
        item({ id: "b", dueAt: addDays(NOW, 2).toISOString() }),
        item({ id: "past", dueAt: addDays(NOW, -1).toISOString() }),
      ],
      NOW,
    );
    expect(boundary?.toISOString()).toBe(addDays(NOW, 2).toISOString());
  });

  it("returns null when nothing is pending", () => {
    expect(nextDueBoundary([], NOW)).toBeNull();
    expect(
      nextDueBoundary([item({ status: "completed" })], NOW),
    ).toBeNull();
    expect(
      nextDueBoundary([item({ dueAt: addDays(NOW, -1).toISOString() })], NOW),
    ).toBeNull();
  });
});

describe("isSourceMissing", () => {
  it("detects a removed source document without touching the progress", () => {
    expect(isSourceMissing(concept(), ["doc-1", "doc-2"])).toBe(false);
    expect(isSourceMissing(concept(), ["doc-2"])).toBe(true);
    expect(isSourceMissing(concept(), [])).toBe(true);
  });
});
