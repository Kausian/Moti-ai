import { describe, expect, it } from "vitest";
import type { MemoryEchoItem, SaveLearningOutcomeInput } from "@/lib/types";
import {
  addDays,
  applyReviewDecision,
  classifyMemoryEchoItem,
  initialDueAt,
  isValidMemoryEchoPrompt,
  upsertMemoryEchoItem,
} from "./memory-echo-policy";
import {
  INITIAL_REVIEW_DAYS,
  MAX_MEMORY_ECHO_PROMPT_LENGTH,
  MAX_SOURCE_IDS_PER_RECORD,
  NEXT_PRACTICE_DAYS,
} from "./constants";

const NOW = new Date("2025-06-01T12:00:00.000Z");

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

function item(overrides: Partial<MemoryEchoItem> = {}): MemoryEchoItem {
  return {
    id: "echo-1",
    courseId: "course-1",
    conceptId: "course-1:doc-1:ai-hallucinations",
    conceptTitle: "AI Hallucinations",
    prompt: "Why can a confident AI answer still be unreliable?",
    status: "scheduled",
    dueAt: addDays(NOW, 2).toISOString(),
    sourceIds: ["doc-1:chunk:0"],
    sourceDocumentTitle: "Responsible AI Guide",
    createdAt: NOW.toISOString(),
    updatedAt: NOW.toISOString(),
    ...overrides,
  };
}

describe("initial review schedule", () => {
  it("brings weaker understanding back sooner", () => {
    expect(initialDueAt("exploring", NOW).toISOString()).toBe(
      addDays(NOW, INITIAL_REVIEW_DAYS.exploring).toISOString(),
    );
    expect(initialDueAt("developing", NOW).toISOString()).toBe(
      addDays(NOW, INITIAL_REVIEW_DAYS.developing).toISOString(),
    );
    expect(initialDueAt("understood", NOW).toISOString()).toBe(
      addDays(NOW, INITIAL_REVIEW_DAYS.understood).toISOString(),
    );
    expect(INITIAL_REVIEW_DAYS.exploring).toBeLessThan(INITIAL_REVIEW_DAYS.understood);
  });
});

describe("prompt validation", () => {
  it("accepts a real prompt and rejects empty or over-long ones", () => {
    expect(isValidMemoryEchoPrompt("Explain it back.")).toBe(true);
    expect(isValidMemoryEchoPrompt("   ")).toBe(false);
    expect(isValidMemoryEchoPrompt(undefined)).toBe(false);
    expect(isValidMemoryEchoPrompt("x".repeat(MAX_MEMORY_ECHO_PROMPT_LENGTH))).toBe(
      true,
    );
    expect(
      isValidMemoryEchoPrompt("x".repeat(MAX_MEMORY_ECHO_PROMPT_LENGTH + 1)),
    ).toBe(false);
  });
});

describe("classifyMemoryEchoItem", () => {
  it("classifies a due item", () => {
    expect(
      classifyMemoryEchoItem(item({ dueAt: addDays(NOW, -1).toISOString() }), NOW),
    ).toBe("due");
    // Exactly at the boundary counts as due.
    expect(classifyMemoryEchoItem(item({ dueAt: NOW.toISOString() }), NOW)).toBe("due");
  });

  it("classifies a future item", () => {
    expect(
      classifyMemoryEchoItem(item({ dueAt: addDays(NOW, 3).toISOString() }), NOW),
    ).toBe("later");
  });

  it("classifies a completed item regardless of its due date", () => {
    expect(
      classifyMemoryEchoItem(
        item({ status: "completed", dueAt: addDays(NOW, -5).toISOString() }),
        NOW,
      ),
    ).toBe("completed");
  });
});

describe("upsertMemoryEchoItem", () => {
  it("creates one item for a concept's first prompt", () => {
    const created = upsertMemoryEchoItem({
      existingOpen: null,
      conceptId: "course-1:doc-1:ai-hallucinations",
      mastery: "developing",
      outcome: outcome(),
      now: NOW,
      itemId: "echo-new",
    });

    expect(created.id).toBe("echo-new");
    expect(created.status).toBe("scheduled");
    expect(created.dueAt).toBe(
      addDays(NOW, INITIAL_REVIEW_DAYS.developing).toISOString(),
    );
  });

  it("updates the existing open item rather than duplicating it", () => {
    const existing = item({ prompt: "An older prompt." });
    const updated = upsertMemoryEchoItem({
      existingOpen: existing,
      conceptId: existing.conceptId,
      mastery: "developing",
      outcome: outcome({ memoryEchoPrompt: "A newer prompt." }),
      now: NOW,
      itemId: "echo-should-not-be-used",
    });

    // Same card, refreshed — never a second one.
    expect(updated.id).toBe(existing.id);
    expect(updated.prompt).toBe("A newer prompt.");
  });

  it("preserves the earliest useful due date when updating", () => {
    const soon = item({ dueAt: addDays(NOW, 1).toISOString() });
    const updated = upsertMemoryEchoItem({
      existingOpen: soon,
      conceptId: soon.conceptId,
      mastery: "understood",
      outcome: outcome(),
      now: NOW,
      itemId: "echo-2",
    });
    // Practising again must not push an already-imminent review further away.
    expect(updated.dueAt).toBe(soon.dueAt);
  });

  it("pulls a distant due date forward when the new schedule is sooner", () => {
    const distant = item({ dueAt: addDays(NOW, 30).toISOString() });
    const updated = upsertMemoryEchoItem({
      existingOpen: distant,
      conceptId: distant.conceptId,
      mastery: "exploring",
      outcome: outcome(),
      now: NOW,
      itemId: "echo-2",
    });
    expect(updated.dueAt).toBe(
      addDays(NOW, INITIAL_REVIEW_DAYS.exploring).toISOString(),
    );
  });

  it("bounds the stored source ids", () => {
    const created = upsertMemoryEchoItem({
      existingOpen: null,
      conceptId: "c",
      mastery: "developing",
      outcome: outcome({ sourceIds: ["a", "b", "c", "d", "e", "f"] }),
      now: NOW,
      itemId: "echo-1",
    });
    expect(created.sourceIds).toHaveLength(MAX_SOURCE_IDS_PER_RECORD);
  });
});

describe("applyReviewDecision", () => {
  it("completes the item when the learner remembered it", () => {
    const reviewed = applyReviewDecision(item(), "remembered", NOW);
    expect(reviewed.status).toBe("completed");
    expect(reviewed.completedAt).toBe(NOW.toISOString());
  });

  it("schedules tomorrow when more practice is needed", () => {
    const reviewed = applyReviewDecision(item(), "needs-practice", NOW);
    expect(reviewed.status).toBe("scheduled");
    expect(reviewed.dueAt).toBe(addDays(NOW, NEXT_PRACTICE_DAYS).toISOString());
    expect(reviewed.completedAt).toBeUndefined();
  });

  it("schedules tomorrow when postponing without self-assessment", () => {
    const reviewed = applyReviewDecision(item(), "review-tomorrow", NOW);
    expect(reviewed.status).toBe("scheduled");
    expect(reviewed.dueAt).toBe(addDays(NOW, NEXT_PRACTICE_DAYS).toISOString());
  });

  it("reopens a completed item and clears its completion", () => {
    const completed = item({ status: "completed", completedAt: NOW.toISOString() });
    const reopened = applyReviewDecision(completed, "needs-practice", NOW);
    expect(reopened.status).toBe("scheduled");
    expect(reopened.completedAt).toBeUndefined();
  });
});
