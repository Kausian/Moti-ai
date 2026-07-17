import { describe, expect, it } from "vitest";
import type { LearningProgressState, SaveLearningOutcomeInput } from "@/lib/types";
import {
  emptyProgressState,
  pruneProcessedActivityIds,
  saveOutcome,
  type SaveOutcomeContext,
} from "./reducer";
import { MAX_PROCESSED_ACTIVITY_IDS } from "./constants";

const NOW = new Date("2025-06-01T12:00:00.000Z");

describe("pruneProcessedActivityIds", () => {
  it("returns the list unchanged when at or below the limit", () => {
    const ids = ["a", "b", "c"];
    expect(pruneProcessedActivityIds(ids, new Set(), 3)).toEqual(ids);
    expect(pruneProcessedActivityIds(ids, new Set(), 5)).toEqual(ids);
  });

  it("keeps the newest ids and drops the oldest, preserving order", () => {
    const ids = ["a", "b", "c", "d", "e"];
    expect(pruneProcessedActivityIds(ids, new Set(), 2)).toEqual(["d", "e"]);
  });

  it("retains protected ids even when they would otherwise age out", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const kept = pruneProcessedActivityIds(ids, new Set(["a"]), 2);
    // "a" is protected (still referenced by evidence); "d","e" are newest.
    expect(kept).toEqual(["a", "d", "e"]);
  });

  it("does not duplicate an id that is both newest and protected", () => {
    const ids = ["a", "b", "c"];
    const kept = pruneProcessedActivityIds(ids, new Set(["c"]), 1);
    expect(kept).toEqual(["c"]);
  });

  it("enforces the default limit of 500", () => {
    const ids = Array.from({ length: 600 }, (_, i) => `id-${i}`);
    const kept = pruneProcessedActivityIds(ids, new Set());
    expect(kept).toHaveLength(MAX_PROCESSED_ACTIVITY_IDS);
    expect(kept[0]).toBe("id-100");
    expect(kept.at(-1)).toBe("id-599");
  });
});

function context(seed: number): SaveOutcomeContext {
  let counter = seed;
  return {
    now: NOW,
    newEvidenceId: () => `ev-${(counter += 1)}`,
    newMemoryEchoItemId: () => `echo-${(counter += 1)}`,
  };
}

function outcome(index: number): SaveLearningOutcomeInput {
  return {
    activityId: `act-${index}`,
    activityType: "micro-challenge",
    courseId: "course-1",
    conceptTitle: `Concept ${index}`,
    sourceDocumentId: "doc-1",
    sourceDocumentTitle: "Guide",
    sectionHeading: `Concept ${index}`,
    sourceIds: ["doc-1:chunk:0"],
    masteryRecommendation: "developing",
    challengeOutcome: "partially-correct",
    attemptNumber: 1,
  };
}

describe("saveOutcome bounds the idempotency ledger", () => {
  it("keeps processedActivityIds within the cap after a new save", () => {
    // Start with a full ledger of stale ids and no matching concepts/evidence.
    const staleIds = Array.from({ length: MAX_PROCESSED_ACTIVITY_IDS }, (_, i) => `stale-${i}`);
    const base: LearningProgressState = {
      ...emptyProgressState(NOW),
      processedActivityIds: staleIds,
    };

    const result = saveOutcome(base, outcome(1), context(0));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const ledger = result.state.processedActivityIds;
    expect(ledger).toHaveLength(MAX_PROCESSED_ACTIVITY_IDS);
    // The newly saved id is retained; the oldest stale id was dropped.
    expect(ledger).toContain("act-1");
    expect(ledger).not.toContain("stale-0");
    expect(ledger[MAX_PROCESSED_ACTIVITY_IDS - 1]).toBe("act-1");
  });

  it("protects an id still referenced by stored evidence from being dropped", () => {
    // Save one real outcome so a concept + evidence referencing act-real exists.
    const withReal = saveOutcome(emptyProgressState(NOW), outcome(999), context(0));
    expect(withReal.ok).toBe(true);
    if (!withReal.ok) return;

    // Pad the ledger with stale ids in front of the real one, over the cap.
    const staleIds = Array.from({ length: MAX_PROCESSED_ACTIVITY_IDS }, (_, i) => `stale-${i}`);
    const padded: LearningProgressState = {
      ...withReal.state,
      processedActivityIds: [...staleIds, "act-999"],
    };

    const result = saveOutcome(padded, outcome(1000), context(100));
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    // act-999 is still referenced by concept evidence, so it survives pruning
    // even though it is older than the newest window.
    expect(result.state.processedActivityIds).toContain("act-999");
  });
});
