import { describe, expect, it } from "vitest";
import { validateTeachBackRequest } from "./validate-teach-back-request";
import {
  MAX_CONCEPT_TITLE_LENGTH,
  MAX_EXPLANATION_LENGTH,
  MIN_EXPLANATION_LENGTH,
} from "./constants";
import { MAX_SOURCE_CONTENT_LENGTH } from "@/lib/chat/constants";

function source(id: string, content = "Grounded source content.") {
  return {
    chunkId: id,
    documentId: "doc-1",
    documentTitle: "Responsible AI Guide",
    sectionHeading: "Hallucinations",
    chunkIndex: 0,
    content,
  };
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    conceptTitle: "AI Hallucinations",
    learnerExplanation: "An AI hallucination is a confident but unsupported answer.",
    course: {
      title: "Responsible AI",
      learnerLevel: "beginner",
      learningObjective: "Spot unreliable AI answers.",
      assistantInstructions: "Coach warmly.",
    },
    sources: [source("doc-1:chunk:0")],
    ...overrides,
  };
}

describe("validateTeachBackRequest", () => {
  it("accepts a valid request", () => {
    const result = validateTeachBackRequest(validBody());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.conceptTitle).toBe("AI Hallucinations");
      expect(result.value.sources).toHaveLength(1);
    }
  });

  it("trims the concept title and the explanation", () => {
    const result = validateTeachBackRequest(
      validBody({
        conceptTitle: "  AI Hallucinations  ",
        learnerExplanation: "   A confident but unsupported answer.   ",
      }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.conceptTitle).toBe("AI Hallucinations");
      expect(result.value.learnerExplanation).toBe(
        "A confident but unsupported answer.",
      );
    }
  });

  it("rejects a missing concept title", () => {
    expect(validateTeachBackRequest(validBody({ conceptTitle: undefined })).ok).toBe(
      false,
    );
    expect(validateTeachBackRequest(validBody({ conceptTitle: "   " })).ok).toBe(false);
  });

  it("rejects a concept title that is too long", () => {
    const result = validateTeachBackRequest(
      validBody({ conceptTitle: "x".repeat(MAX_CONCEPT_TITLE_LENGTH + 1) }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an explanation below the minimum length", () => {
    const result = validateTeachBackRequest(
      validBody({ learnerExplanation: "x".repeat(MIN_EXPLANATION_LENGTH - 1) }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an explanation above the maximum length", () => {
    const result = validateTeachBackRequest(
      validBody({ learnerExplanation: "x".repeat(MAX_EXPLANATION_LENGTH + 1) }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects an invalid learner level", () => {
    const result = validateTeachBackRequest(
      validBody({
        course: { ...validBody().course, learnerLevel: "expert" },
      }),
    );
    expect(result.ok).toBe(false);
  });

  it("rejects a request with no sources", () => {
    expect(validateTeachBackRequest(validBody({ sources: [] })).ok).toBe(false);
  });

  it("rejects more than four sources", () => {
    const result = validateTeachBackRequest({
      ...validBody(),
      sources: [0, 1, 2, 3, 4].map((i) => source(`doc-1:chunk:${i}`)),
    });
    expect(result.ok).toBe(false);
  });

  it("rejects source content that is too long", () => {
    const result = validateTeachBackRequest({
      ...validBody(),
      sources: [source("doc-1:chunk:0", "x".repeat(MAX_SOURCE_CONTENT_LENGTH + 1))],
    });
    expect(result.ok).toBe(false);
  });

  it("accepts source content exactly at the combined cap, and rejects anything larger", () => {
    // The per-source cap (1500) x the source cap (4) is exactly the total cap
    // (6000), so the maximum legal payload sits precisely on the boundary. The
    // total guard is defence-in-depth: any attempt to exceed 6000 must first
    // breach the per-source cap, so an over-total payload is always rejected.
    const atCap = [0, 1, 2, 3].map((i) =>
      source(`doc-1:chunk:${i}`, "x".repeat(MAX_SOURCE_CONTENT_LENGTH)),
    );
    expect(validateTeachBackRequest({ ...validBody(), sources: atCap }).ok).toBe(true);

    const overCap = [
      ...atCap.slice(0, 3),
      source("doc-1:chunk:3", "x".repeat(MAX_SOURCE_CONTENT_LENGTH + 1)),
    ];
    expect(validateTeachBackRequest({ ...validBody(), sources: overCap }).ok).toBe(
      false,
    );
  });

  it("enforces the combined source cap independently of the per-source cap", () => {
    // Directly exercises the total guard: five in-range sources would exceed
    // 6000 characters in total (the source-count cap also rejects this, so the
    // request can never reach Gemini oversized).
    const result = validateTeachBackRequest({
      ...validBody(),
      sources: [0, 1, 2, 3, 4].map((i) =>
        source(`doc-1:chunk:${i}`, "x".repeat(MAX_SOURCE_CONTENT_LENGTH)),
      ),
    });
    expect(result.ok).toBe(false);
  });

  it("rejects duplicate source ids", () => {
    const result = validateTeachBackRequest({
      ...validBody(),
      sources: [source("doc-1:chunk:0"), source("doc-1:chunk:0")],
    });
    expect(result.ok).toBe(false);
  });

  it("rejects malformed bodies", () => {
    expect(validateTeachBackRequest(null).ok).toBe(false);
    expect(validateTeachBackRequest("a string").ok).toBe(false);
    expect(validateTeachBackRequest([]).ok).toBe(false);
    expect(validateTeachBackRequest({}).ok).toBe(false);
    expect(validateTeachBackRequest(validBody({ sources: "nope" })).ok).toBe(false);
    expect(validateTeachBackRequest(validBody({ course: null })).ok).toBe(false);
  });

  it("rejects malformed source metadata", () => {
    const bad = [
      { ...source("a"), documentId: "" },
      { ...source("a"), documentTitle: "" },
      { ...source("a"), chunkIndex: -1 },
      { ...source("a"), chunkIndex: 1.5 },
      { ...source("a"), content: "   " },
      { ...source("a"), sectionHeading: 42 },
    ];
    for (const item of bad) {
      expect(validateTeachBackRequest(validBody({ sources: [item] })).ok).toBe(false);
    }
  });

  it("never carries conversation history into the validated request", () => {
    // Even if a client smuggles a history field, the closed shape drops it, so
    // chat history can never reach the teach-back prompt.
    const result = validateTeachBackRequest(
      validBody({ history: [{ role: "user", content: "unrelated chat" }] }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toHaveProperty("history");
      expect(Object.keys(result.value).sort()).toEqual([
        "conceptTitle",
        "course",
        "learnerExplanation",
        "sources",
      ]);
    }
  });
});
