import { describe, expect, it } from "vitest";
import type { LearningProgressState, SaveLearningOutcomeInput } from "@/lib/types";
import {
  emptyProgressState,
  removeMemoryEchoItem,
  rescheduleMemoryEchoItem,
  resetCourseProgress,
  reviewMemoryEchoItem,
  saveOutcome,
  type SaveOutcomeContext,
} from "./reducer";
import { addDays } from "./memory-echo-policy";
import { MAX_CONCEPTS_PER_COURSE } from "./constants";

const NOW = new Date("2025-06-01T12:00:00.000Z");
const CONCEPT_ID = "course-1:doc-1:ai-hallucinations";

let counter = 0;
function context(): SaveOutcomeContext {
  return {
    now: NOW,
    newEvidenceId: () => `ev-${(counter += 1)}`,
    newMemoryEchoItemId: () => `echo-${(counter += 1)}`,
  };
}

function outcome(
  overrides: Partial<SaveLearningOutcomeInput> = {},
): SaveLearningOutcomeInput {
  return {
    activityId: "act-1",
    activityType: "moti-mirror",
    courseId: "course-1",
    conceptTitle: "AI Hallucinations",
    sourceDocumentId: "doc-1",
    sourceDocumentTitle: "Responsible AI Guide",
    sectionHeading: "AI Hallucinations",
    sourceIds: ["doc-1:chunk:0"],
    masteryRecommendation: "developing",
    memoryEchoPrompt: "Why can a confident AI answer still be unreliable?",
    ...overrides,
  };
}

function saved(
  state: LearningProgressState,
  input: SaveLearningOutcomeInput,
): LearningProgressState {
  const result = saveOutcome(state, input, context());
  if (!result.ok) throw new Error(`expected save to succeed: ${result.reason}`);
  return result.state;
}

describe("saveOutcome", () => {
  it("creates the concept and its review item atomically", () => {
    const state = saved(emptyProgressState(NOW), outcome());

    expect(state.concepts).toHaveLength(1);
    expect(state.concepts[0].id).toBe(CONCEPT_ID);
    expect(state.memoryEchoItems).toHaveLength(1);
    expect(state.memoryEchoItems[0].conceptId).toBe(CONCEPT_ID);
    expect(state.processedActivityIds).toEqual(["act-1"]);
  });

  it("is idempotent: the same activity never saves twice", () => {
    const first = saved(emptyProgressState(NOW), outcome());
    const again = saveOutcome(first, outcome(), context());

    expect(again.ok).toBe(true);
    if (!again.ok) return;
    expect(again.alreadySaved).toBe(true);
    // Nothing changed at all.
    expect(again.state).toBe(first);
    expect(again.state.concepts[0].activityCount).toBe(1);
    expect(again.state.memoryEchoItems).toHaveLength(1);
  });

  it("updates the same concept without duplicating it or its review item", () => {
    let state = saved(emptyProgressState(NOW), outcome());
    state = saved(
      state,
      outcome({ activityId: "act-2", masteryRecommendation: "understood" }),
    );

    expect(state.concepts).toHaveLength(1);
    expect(state.concepts[0].masteryStatus).toBe("understood");
    expect(state.concepts[0].activityCount).toBe(2);
    expect(state.memoryEchoItems).toHaveLength(1);
  });

  it("rejects an unevaluated result", () => {
    const result = saveOutcome(
      emptyProgressState(NOW),
      outcome({ masteryRecommendation: "not-evaluated" }),
      context(),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a result with no validated source", () => {
    const result = saveOutcome(
      emptyProgressState(NOW),
      outcome({ sourceIds: [] }),
      context(),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a missing activity id", () => {
    const result = saveOutcome(
      emptyProgressState(NOW),
      outcome({ activityId: "  " }),
      context(),
    );
    expect(result.ok).toBe(false);
  });

  it("creates no review item when there is no prompt", () => {
    const state = saved(
      emptyProgressState(NOW),
      outcome({ memoryEchoPrompt: undefined }),
    );
    expect(state.concepts).toHaveLength(1);
    expect(state.memoryEchoItems).toHaveLength(0);
  });

  it("reports the concept limit instead of dropping the newest work", () => {
    let state = emptyProgressState(NOW);
    for (let i = 0; i < MAX_CONCEPTS_PER_COURSE; i += 1) {
      state = saved(
        state,
        outcome({
          activityId: `act-${i}`,
          sourceDocumentId: `doc-${i}`,
          memoryEchoPrompt: undefined,
        }),
      );
    }
    const overflow = saveOutcome(
      state,
      outcome({ activityId: "one-too-many", sourceDocumentId: "doc-overflow" }),
      context(),
    );
    expect(overflow.ok).toBe(false);
    if (!overflow.ok) expect(overflow.reason).toContain("prototype");
  });
});

describe("reviewMemoryEchoItem", () => {
  it("completes the item and clears the concept's review flag", () => {
    let state = saved(emptyProgressState(NOW), outcome());
    state = saved(
      state,
      outcome({ activityId: "act-2", masteryRecommendation: "exploring" }),
    );
    expect(state.concepts[0].needsReview).toBe(true);

    const itemId = state.memoryEchoItems[0].id;
    const result = reviewMemoryEchoItem(state, itemId, "remembered", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.memoryEchoItems[0].status).toBe("completed");
    expect(result.state.concepts[0].needsReview).toBe(false);
  });

  it("needing practice reschedules and flags the concept", () => {
    const state = saved(emptyProgressState(NOW), outcome());
    const itemId = state.memoryEchoItems[0].id;

    const result = reviewMemoryEchoItem(state, itemId, "needs-practice", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.memoryEchoItems[0].status).toBe("scheduled");
    expect(result.state.concepts[0].needsReview).toBe(true);
  });

  it("postponing says nothing about understanding", () => {
    const state = saved(emptyProgressState(NOW), outcome());
    const itemId = state.memoryEchoItems[0].id;

    const result = reviewMemoryEchoItem(state, itemId, "review-tomorrow", NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // Deliberately unchanged: a postponement is not a self-assessment.
    expect(result.state.concepts[0].needsReview).toBe(
      state.concepts[0].needsReview,
    );
  });

  it("fails safely for an unknown item", () => {
    const result = reviewMemoryEchoItem(
      emptyProgressState(NOW),
      "nope",
      "remembered",
      NOW,
    );
    expect(result.ok).toBe(false);
  });
});

describe("rescheduleMemoryEchoItem / removeMemoryEchoItem", () => {
  it("reschedules an item", () => {
    const state = saved(emptyProgressState(NOW), outcome());
    const itemId = state.memoryEchoItems[0].id;
    const dueAt = addDays(NOW, 1);

    const result = rescheduleMemoryEchoItem(state, itemId, dueAt, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.state.memoryEchoItems[0].dueAt).toBe(dueAt.toISOString());
  });

  it("removes only the selected item and keeps the concept", () => {
    const state = saved(emptyProgressState(NOW), outcome());
    const itemId = state.memoryEchoItems[0].id;

    const result = removeMemoryEchoItem(state, itemId, NOW);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.state.memoryEchoItems).toHaveLength(0);
    // Removing a reminder must not erase the learning it came from.
    expect(result.state.concepts).toHaveLength(1);
  });
});

describe("resetCourseProgress", () => {
  it("clears the current course and leaves another course intact", () => {
    let state = saved(emptyProgressState(NOW), outcome());
    state = saved(
      state,
      outcome({
        activityId: "other-1",
        courseId: "course-2",
        conceptTitle: "Prompt Injection",
      }),
    );
    expect(state.concepts).toHaveLength(2);

    const reset = resetCourseProgress(state, "course-1", NOW);

    expect(reset.concepts).toHaveLength(1);
    expect(reset.concepts[0].courseId).toBe("course-2");
    expect(reset.memoryEchoItems).toHaveLength(1);
    expect(reset.memoryEchoItems[0].courseId).toBe("course-2");
    // The other course's activity ledger must survive.
    expect(reset.processedActivityIds).toEqual(["other-1"]);
  });

  it("lets the same activity be saved again after a reset", () => {
    const state = saved(emptyProgressState(NOW), outcome());
    const reset = resetCourseProgress(state, "course-1", NOW);

    const result = saveOutcome(reset, outcome(), context());
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.alreadySaved).toBeUndefined();
    expect(result.state.concepts).toHaveLength(1);
  });
});
