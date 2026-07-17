import { describe, expect, it } from "vitest";
import { validateChallengeEvaluation } from "./validate-challenge-evaluation";
import {
  MAX_CHALLENGE_EXPLANATION_LENGTH,
  MAX_CHALLENGE_LIST_ITEM_LENGTH,
} from "./constants";

const SUPPLIED = ["doc-1:chunk:0", "doc-1:chunk:1"];

function payload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    outcome: "partially-correct",
    feedback: "You have the central idea but missed one detail.",
    correctUnderstanding: ["You knew it produces false output."],
    missingPoints: ["The source stresses the model keeps working."],
    explanation: "A hallucination is fluent output unsupported by the source.",
    usedSourceIds: ["doc-1:chunk:0"],
    memoryEchoPrompt: "Why can a confident AI answer still be unreliable?",
    ...overrides,
  });
}

describe("validateChallengeEvaluation", () => {
  it("accepts a valid evaluation", () => {
    const result = validateChallengeEvaluation(payload(), SUPPLIED);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.outcome).toBe("partially-correct");
      expect(result.value.usedSourceIds).toEqual(["doc-1:chunk:0"]);
    }
  });

  it("accepts each valid outcome", () => {
    for (const outcome of ["correct", "partially-correct", "incorrect"]) {
      expect(validateChallengeEvaluation(payload({ outcome }), SUPPLIED).ok).toBe(true);
    }
  });

  it("rejects an invalid outcome", () => {
    expect(validateChallengeEvaluation(payload({ outcome: "great" }), SUPPLIED).ok).toBe(
      false,
    );
  });

  it("accepts empty coaching lists", () => {
    const result = validateChallengeEvaluation(
      payload({ correctUnderstanding: [], missingPoints: [] }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.correctUnderstanding).toEqual([]);
      expect(result.value.missingPoints).toEqual([]);
    }
  });

  it("removes unknown (invented) source ids", () => {
    const result = validateChallengeEvaluation(
      payload({ usedSourceIds: ["doc-1:chunk:0", "invented:9"] }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.usedSourceIds).toEqual(["doc-1:chunk:0"]);
  });

  it("removes duplicate source ids", () => {
    const result = validateChallengeEvaluation(
      payload({ usedSourceIds: ["doc-1:chunk:0", "doc-1:chunk:0", "doc-1:chunk:1"] }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.usedSourceIds).toEqual(["doc-1:chunk:0", "doc-1:chunk:1"]);
    }
  });

  it("rejects excessive arrays and strings", () => {
    expect(
      validateChallengeEvaluation(payload({ missingPoints: ["a", "b", "c", "d"] }), SUPPLIED)
        .ok,
    ).toBe(false);
    expect(
      validateChallengeEvaluation(
        payload({ missingPoints: ["x".repeat(MAX_CHALLENGE_LIST_ITEM_LENGTH + 1)] }),
        SUPPLIED,
      ).ok,
    ).toBe(false);
    expect(
      validateChallengeEvaluation(
        payload({ explanation: "x".repeat(MAX_CHALLENGE_EXPLANATION_LENGTH + 1) }),
        SUPPLIED,
      ).ok,
    ).toBe(false);
  });

  it("rejects a marked answer with no explanation", () => {
    expect(
      validateChallengeEvaluation(payload({ explanation: "   " }), SUPPLIED).ok,
    ).toBe(false);
  });

  it("rejects empty, malformed, or non-object output", () => {
    expect(validateChallengeEvaluation(undefined, SUPPLIED).ok).toBe(false);
    expect(validateChallengeEvaluation("{not json", SUPPLIED).ok).toBe(false);
    expect(validateChallengeEvaluation("[]", SUPPLIED).ok).toBe(false);
    expect(validateChallengeEvaluation(payload({ feedback: "  " }), SUPPLIED).ok).toBe(
      false,
    );
  });

  it("strips all evaluative detail when the answer was not evaluated", () => {
    const result = validateChallengeEvaluation(
      payload({
        outcome: "not-evaluated",
        correctUnderstanding: ["should be dropped"],
        missingPoints: ["should be dropped"],
        usedSourceIds: ["doc-1:chunk:0"],
        memoryEchoPrompt: "dropped",
      }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.correctUnderstanding).toEqual([]);
      expect(result.value.missingPoints).toEqual([]);
      expect(result.value.usedSourceIds).toEqual([]);
      expect(result.value.explanation).toBe("");
      expect(result.value.memoryEchoPrompt).toBeUndefined();
    }
  });

  it("accepts a not-evaluated response with no explanation", () => {
    expect(
      validateChallengeEvaluation(
        payload({ outcome: "not-evaluated", explanation: "" }),
        SUPPLIED,
      ).ok,
    ).toBe(true);
  });
});
