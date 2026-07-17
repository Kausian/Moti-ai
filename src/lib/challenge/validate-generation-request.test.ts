import { describe, expect, it } from "vitest";
import { validateGenerationRequest } from "./validate-generation-request";
import { MAX_CHALLENGE_CONCEPT_LENGTH } from "./constants";
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
    requestedType: "auto",
    difficulty: "beginner",
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

describe("validateGenerationRequest", () => {
  it("accepts a valid request", () => {
    const result = validateGenerationRequest(validBody());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.conceptTitle).toBe("AI Hallucinations");
      expect(result.value.requestedType).toBe("auto");
      expect(result.value.difficulty).toBe("beginner");
    }
  });

  it("accepts every supported challenge type", () => {
    for (const type of [
      "multiple-choice",
      "scenario",
      "correct-the-mistake",
      "explain-in-own-words",
    ]) {
      expect(validateGenerationRequest(validBody({ requestedType: type })).ok).toBe(
        true,
      );
    }
  });

  it("rejects a missing concept", () => {
    expect(validateGenerationRequest(validBody({ conceptTitle: "  " })).ok).toBe(false);
    expect(validateGenerationRequest(validBody({ conceptTitle: undefined })).ok).toBe(
      false,
    );
  });

  it("rejects a concept that is too long", () => {
    expect(
      validateGenerationRequest(
        validBody({ conceptTitle: "x".repeat(MAX_CHALLENGE_CONCEPT_LENGTH + 1) }),
      ).ok,
    ).toBe(false);
  });

  it("rejects an invalid challenge type", () => {
    expect(validateGenerationRequest(validBody({ requestedType: "quiz" })).ok).toBe(
      false,
    );
  });

  it("rejects an invalid difficulty", () => {
    expect(validateGenerationRequest(validBody({ difficulty: "expert" })).ok).toBe(
      false,
    );
  });

  it("rejects an invalid learner level", () => {
    expect(
      validateGenerationRequest(
        validBody({ course: { ...validBody().course, learnerLevel: "expert" } }),
      ).ok,
    ).toBe(false);
  });

  it("rejects a request with no sources", () => {
    expect(validateGenerationRequest(validBody({ sources: [] })).ok).toBe(false);
  });

  it("rejects more than four sources", () => {
    expect(
      validateGenerationRequest({
        ...validBody(),
        sources: [0, 1, 2, 3, 4].map((i) => source(`doc-1:chunk:${i}`)),
      }).ok,
    ).toBe(false);
  });

  it("rejects source content that is too long", () => {
    expect(
      validateGenerationRequest({
        ...validBody(),
        sources: [source("doc-1:chunk:0", "x".repeat(MAX_SOURCE_CONTENT_LENGTH + 1))],
      }).ok,
    ).toBe(false);
  });

  it("rejects duplicate source ids", () => {
    expect(
      validateGenerationRequest({
        ...validBody(),
        sources: [source("doc-1:chunk:0"), source("doc-1:chunk:0")],
      }).ok,
    ).toBe(false);
  });

  it("rejects malformed bodies", () => {
    expect(validateGenerationRequest(null).ok).toBe(false);
    expect(validateGenerationRequest("a string").ok).toBe(false);
    expect(validateGenerationRequest([]).ok).toBe(false);
    expect(validateGenerationRequest({}).ok).toBe(false);
    expect(validateGenerationRequest(validBody({ course: null })).ok).toBe(false);
    expect(validateGenerationRequest(validBody({ sources: "nope" })).ok).toBe(false);
  });

  it("never carries conversation history into the validated request", () => {
    const result = validateGenerationRequest(
      validBody({ history: [{ role: "user", content: "unrelated chat" }] }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toHaveProperty("history");
      expect(Object.keys(result.value).sort()).toEqual([
        "conceptTitle",
        "course",
        "difficulty",
        "requestedType",
        "sources",
      ]);
    }
  });
});
