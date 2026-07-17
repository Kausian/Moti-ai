import { describe, expect, it } from "vitest";
import type { LearningProgressState } from "@/lib/types";
import { isLearningProgressState } from "./storage";
import { emptyProgressState } from "./reducer";
import { LEARNING_PROGRESS_VERSION } from "./constants";

const NOW = new Date("2025-06-01T12:00:00.000Z");

function validState(): LearningProgressState {
  return {
    ...emptyProgressState(NOW),
    concepts: [
      {
        id: "course-1:doc-1:a",
        courseId: "course-1",
        conceptTitle: "A",
        sourceDocumentId: "doc-1",
        sourceDocumentTitle: "Guide",
        sectionHeading: "A",
        masteryStatus: "understood",
        needsReview: true,
        activityCount: 2,
        successfulActivityCount: 1,
        lastActivityType: "micro-challenge",
        lastActivityAt: NOW.toISOString(),
        sourceIds: ["doc-1:chunk:0"],
        evidence: [
          {
            id: "ev-1",
            activityId: "act-1",
            activityType: "micro-challenge",
            masteryRecommendation: "understood",
            challengeOutcome: "correct",
            attemptNumber: 1,
            sourceIds: ["doc-1:chunk:0"],
            createdAt: NOW.toISOString(),
          },
        ],
      },
    ],
    memoryEchoItems: [
      {
        id: "echo-1",
        courseId: "course-1",
        conceptId: "course-1:doc-1:a",
        conceptTitle: "A",
        prompt: "Recall it.",
        status: "scheduled",
        dueAt: NOW.toISOString(),
        sourceIds: ["doc-1:chunk:0"],
        sourceDocumentTitle: "Guide",
        createdAt: NOW.toISOString(),
        updatedAt: NOW.toISOString(),
      },
    ],
    processedActivityIds: ["act-1"],
  };
}

/** Mirrors what `loadLearningProgress` does once the raw string is read. */
function parseStored(raw: string): LearningProgressState | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  return isLearningProgressState(parsed) ? parsed : null;
}

describe("isLearningProgressState", () => {
  it("accepts a valid state", () => {
    expect(isLearningProgressState(validState())).toBe(true);
    expect(isLearningProgressState(emptyProgressState(NOW))).toBe(true);
  });

  it("survives a save/load round trip", () => {
    const original = validState();
    const restored = parseStored(JSON.stringify(original));
    expect(restored).toEqual(original);
  });

  it("rejects an outdated version so the app falls back to empty", () => {
    expect(
      isLearningProgressState({
        ...validState(),
        version: LEARNING_PROGRESS_VERSION + 1,
      }),
    ).toBe(false);
    expect(isLearningProgressState({ ...validState(), version: 0 })).toBe(false);
  });

  it("falls back safely on malformed JSON", () => {
    expect(parseStored("{not json")).toBeNull();
    expect(parseStored("[]")).toBeNull();
    expect(parseStored("null")).toBeNull();
  });

  it("rejects invalid concept data", () => {
    const bad = validState();
    expect(
      isLearningProgressState({
        ...bad,
        concepts: [{ ...bad.concepts[0], masteryStatus: "mastered" }],
      }),
    ).toBe(false);
    expect(
      isLearningProgressState({
        ...bad,
        concepts: [{ ...bad.concepts[0], needsReview: "yes" }],
      }),
    ).toBe(false);
    expect(
      isLearningProgressState({
        ...bad,
        concepts: [{ ...bad.concepts[0], evidence: [{ id: "broken" }] }],
      }),
    ).toBe(false);
    expect(isLearningProgressState({ ...bad, concepts: "nope" })).toBe(false);
  });

  it("rejects invalid Memory Echo data", () => {
    const bad = validState();
    expect(
      isLearningProgressState({
        ...bad,
        memoryEchoItems: [{ ...bad.memoryEchoItems[0], status: "snoozed" }],
      }),
    ).toBe(false);
    expect(
      isLearningProgressState({
        ...bad,
        memoryEchoItems: [{ ...bad.memoryEchoItems[0], dueAt: 12345 }],
      }),
    ).toBe(false);
    expect(isLearningProgressState({ ...bad, memoryEchoItems: {} })).toBe(false);
  });

  it("rejects a malformed activity ledger", () => {
    expect(
      isLearningProgressState({ ...validState(), processedActivityIds: [1, 2] }),
    ).toBe(false);
  });
});
