import { describe, expect, it } from "vitest";
import { validateEvaluationRequest } from "./validate-evaluation-request";
import { MAX_CHALLENGE_ATTEMPTS, MAX_WRITTEN_ANSWER_LENGTH } from "./constants";

function source(id: string) {
  return {
    chunkId: id,
    documentId: "doc-1",
    documentTitle: "Responsible AI Guide",
    sectionHeading: "Hallucinations",
    chunkIndex: 0,
    content: "An AI hallucination is confident but unsupported output.",
  };
}

const CHOICE_CHALLENGE = {
  challengeId: "c1",
  challengeType: "multiple-choice",
  conceptTitle: "AI Hallucinations",
  difficulty: "beginner",
  prompt: "What is an AI hallucination?",
  instructions: "Choose the best answer.",
  hint: "Think about whether the model keeps working.",
  options: [
    { id: "a", text: "Confident but unsupported output." },
    { id: "b", text: "The model crashing." },
    { id: "c", text: "A slow response." },
    { id: "d", text: "A refused request." },
  ],
  correctOptionId: "a",
  referenceExplanation: "The source says the model produces confident but false text.",
  usedSourceIds: ["doc-1:chunk:0"],
};

const FREE_CHALLENGE = {
  challengeId: "c2",
  challengeType: "explain-in-own-words",
  conceptTitle: "AI Hallucinations",
  difficulty: "intermediate",
  prompt: "Explain what an AI hallucination is.",
  instructions: "Answer in two or three sentences.",
  hint: "Consider how the model behaves when it does not know.",
  referenceAnswer: "Fluent output unsupported by the source.",
  essentialPoints: ["It sounds confident"],
  usedSourceIds: ["doc-1:chunk:0"],
};

function body(overrides: Record<string, unknown> = {}) {
  return {
    challenge: CHOICE_CHALLENGE,
    learnerResponse: { selectedOptionId: "a" },
    attemptNumber: 1,
    course: { learnerLevel: "beginner", assistantInstructions: "Coach warmly." },
    sources: [source("doc-1:chunk:0")],
    ...overrides,
  };
}

describe("validateEvaluationRequest", () => {
  it("accepts a valid choice response", () => {
    const result = validateEvaluationRequest(body());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.learnerResponse.selectedOptionId).toBe("a");
      expect(result.value.attemptNumber).toBe(1);
    }
  });

  it("requires a selected option for a choice challenge", () => {
    expect(validateEvaluationRequest(body({ learnerResponse: {} })).ok).toBe(false);
    expect(
      validateEvaluationRequest(body({ learnerResponse: { selectedOptionId: "  " } })).ok,
    ).toBe(false);
  });

  it("rejects a selected option that does not exist", () => {
    expect(
      validateEvaluationRequest(body({ learnerResponse: { selectedOptionId: "z" } })).ok,
    ).toBe(false);
  });

  it("accepts a valid free-response answer", () => {
    const result = validateEvaluationRequest(
      body({
        challenge: FREE_CHALLENGE,
        learnerResponse: { writtenAnswer: "Confident but unsupported output." },
      }),
    );
    expect(result.ok).toBe(true);
  });

  it("requires a written answer for a free-response challenge", () => {
    expect(
      validateEvaluationRequest(
        body({ challenge: FREE_CHALLENGE, learnerResponse: {} }),
      ).ok,
    ).toBe(false);
  });

  it("rejects a written answer that is too short or too long", () => {
    expect(
      validateEvaluationRequest(
        body({ challenge: FREE_CHALLENGE, learnerResponse: { writtenAnswer: "no" } }),
      ).ok,
    ).toBe(false);
    expect(
      validateEvaluationRequest(
        body({
          challenge: FREE_CHALLENGE,
          learnerResponse: { writtenAnswer: "x".repeat(MAX_WRITTEN_ANSWER_LENGTH + 1) },
        }),
      ).ok,
    ).toBe(false);
  });

  it("rejects an invalid attempt number", () => {
    expect(validateEvaluationRequest(body({ attemptNumber: 0 })).ok).toBe(false);
    expect(validateEvaluationRequest(body({ attemptNumber: -1 })).ok).toBe(false);
    expect(validateEvaluationRequest(body({ attemptNumber: 1.5 })).ok).toBe(false);
    expect(validateEvaluationRequest(body({ attemptNumber: "1" })).ok).toBe(false);
  });

  it("enforces the maximum number of attempts", () => {
    expect(
      validateEvaluationRequest(body({ attemptNumber: MAX_CHALLENGE_ATTEMPTS })).ok,
    ).toBe(true);
    expect(
      validateEvaluationRequest(body({ attemptNumber: MAX_CHALLENGE_ATTEMPTS + 1 })).ok,
    ).toBe(false);
  });

  it("rejects a malformed challenge object", () => {
    expect(validateEvaluationRequest(body({ challenge: null })).ok).toBe(false);
    expect(validateEvaluationRequest(body({ challenge: {} })).ok).toBe(false);
    expect(
      validateEvaluationRequest(
        body({ challenge: { ...CHOICE_CHALLENGE, challengeId: "" } }),
      ).ok,
    ).toBe(false);
    expect(
      validateEvaluationRequest(
        body({ challenge: { ...CHOICE_CHALLENGE, correctOptionId: "z" } }),
      ).ok,
    ).toBe(false);
  });

  it("rejects a request with no sources", () => {
    expect(validateEvaluationRequest(body({ sources: [] })).ok).toBe(false);
  });

  it("rejects duplicate source ids", () => {
    expect(
      validateEvaluationRequest({
        ...body(),
        sources: [source("doc-1:chunk:0"), source("doc-1:chunk:0")],
      }).ok,
    ).toBe(false);
  });

  it("rejects an invalid learner level", () => {
    expect(
      validateEvaluationRequest(
        body({ course: { learnerLevel: "expert", assistantInstructions: "" } }),
      ).ok,
    ).toBe(false);
  });

  it("rejects malformed bodies", () => {
    expect(validateEvaluationRequest(null).ok).toBe(false);
    expect(validateEvaluationRequest([]).ok).toBe(false);
    expect(validateEvaluationRequest({}).ok).toBe(false);
  });

  it("never carries conversation history into the validated request", () => {
    const result = validateEvaluationRequest(
      body({ history: [{ role: "user", content: "unrelated chat" }] }),
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).not.toHaveProperty("history");
      expect(Object.keys(result.value).sort()).toEqual([
        "attemptNumber",
        "challenge",
        "course",
        "learnerResponse",
        "sources",
      ]);
    }
  });
});
