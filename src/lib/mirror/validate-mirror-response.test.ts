import { describe, expect, it } from "vitest";
import { validateMirrorResponse } from "./validate-mirror-response";
import {
  MAX_IMPROVED_EXPLANATION_LENGTH,
  MAX_LIST_ITEM_LENGTH,
  MAX_MEMORY_ECHO_PROMPT_LENGTH,
} from "./constants";

const SUPPLIED = ["doc-1:chunk:0", "doc-1:chunk:1"];

function feedback(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    responseMode: "teach-back-feedback",
    conceptTitle: "AI Hallucinations",
    knowledgeSufficient: true,
    feedbackSummary: "A solid start with one thing to correct.",
    correctUnderstanding: ["You recognised the answer can be wrong."],
    missingPoints: ["The source stresses it sounds confident."],
    misconceptions: [
      { learnerIdea: "You suggested the model stops working.", correction: "It keeps working and produces unsupported text." },
    ],
    improvedExplanation: "A hallucination is fluent output unsupported by the source.",
    masteryRecommendation: "developing",
    masteryRationale: "Core idea present, one misconception remains.",
    usedSourceIds: ["doc-1:chunk:0"],
    nextAction: "retry-teach-back",
    memoryEchoPrompt: "Why can a confident AI answer still be unreliable?",
    ...overrides,
  });
}

describe("validateMirrorResponse", () => {
  it("accepts valid teach-back feedback", () => {
    const result = validateMirrorResponse(feedback(), SUPPLIED);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.masteryRecommendation).toBe("developing");
      expect(result.value.usedSourceIds).toEqual(["doc-1:chunk:0"]);
      expect(result.value.misconceptions).toHaveLength(1);
      expect(result.value.memoryEchoPrompt).toBeDefined();
    }
  });

  it("accepts an empty correct-understanding array", () => {
    const result = validateMirrorResponse(
      feedback({ correctUnderstanding: [], masteryRecommendation: "exploring" }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.correctUnderstanding).toEqual([]);
  });

  it("accepts an empty misconceptions array", () => {
    const result = validateMirrorResponse(
      feedback({ misconceptions: [], masteryRecommendation: "understood" }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.misconceptions).toEqual([]);
  });

  it("accepts a response with no memoryEchoPrompt", () => {
    const result = validateMirrorResponse(
      feedback({ memoryEchoPrompt: undefined }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.memoryEchoPrompt).toBeUndefined();
  });

  it("rejects empty, malformed, or non-object output", () => {
    expect(validateMirrorResponse(undefined, SUPPLIED).ok).toBe(false);
    expect(validateMirrorResponse("   ", SUPPLIED).ok).toBe(false);
    expect(validateMirrorResponse("{not json", SUPPLIED).ok).toBe(false);
    expect(validateMirrorResponse("[]", SUPPLIED).ok).toBe(false);
  });

  it("rejects an invalid response mode", () => {
    expect(
      validateMirrorResponse(feedback({ responseMode: "freestyle" }), SUPPLIED).ok,
    ).toBe(false);
  });

  it("rejects an invalid mastery recommendation", () => {
    expect(
      validateMirrorResponse(feedback({ masteryRecommendation: "expert" }), SUPPLIED)
        .ok,
    ).toBe(false);
  });

  it("rejects an invalid next action", () => {
    expect(
      validateMirrorResponse(feedback({ nextAction: "take-a-quiz" }), SUPPLIED).ok,
    ).toBe(false);
  });

  it("rejects an empty concept title", () => {
    expect(validateMirrorResponse(feedback({ conceptTitle: "  " }), SUPPLIED).ok).toBe(
      false,
    );
  });

  it("removes unknown (invented) source ids so they never reach the client", () => {
    const result = validateMirrorResponse(
      feedback({ usedSourceIds: ["doc-1:chunk:0", "invented:chunk:99"] }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.usedSourceIds).toEqual(["doc-1:chunk:0"]);
      expect(result.value.usedSourceIds).not.toContain("invented:chunk:99");
    }
  });

  it("removes duplicate source ids", () => {
    const result = validateMirrorResponse(
      feedback({ usedSourceIds: ["doc-1:chunk:0", "doc-1:chunk:0", "doc-1:chunk:1"] }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.usedSourceIds).toEqual(["doc-1:chunk:0", "doc-1:chunk:1"]);
    }
  });

  it("rejects an over-long list", () => {
    expect(
      validateMirrorResponse(feedback({ missingPoints: ["a", "b", "c", "d"] }), SUPPLIED)
        .ok,
    ).toBe(false);
  });

  it("rejects an over-long list item", () => {
    expect(
      validateMirrorResponse(
        feedback({ missingPoints: ["x".repeat(MAX_LIST_ITEM_LENGTH + 1)] }),
        SUPPLIED,
      ).ok,
    ).toBe(false);
  });

  it("rejects an over-long improved explanation", () => {
    expect(
      validateMirrorResponse(
        feedback({
          improvedExplanation: "x".repeat(MAX_IMPROVED_EXPLANATION_LENGTH + 1),
        }),
        SUPPLIED,
      ).ok,
    ).toBe(false);
  });

  it("rejects an over-long memory echo prompt", () => {
    expect(
      validateMirrorResponse(
        feedback({ memoryEchoPrompt: "x".repeat(MAX_MEMORY_ECHO_PROMPT_LENGTH + 1) }),
        SUPPLIED,
      ).ok,
    ).toBe(false);
  });

  it("rejects a malformed misconception", () => {
    expect(
      validateMirrorResponse(feedback({ misconceptions: ["just a string"] }), SUPPLIED)
        .ok,
    ).toBe(false);
    expect(
      validateMirrorResponse(
        feedback({ misconceptions: [{ learnerIdea: "only one half" }] }),
        SUPPLIED,
      ).ok,
    ).toBe(false);
    expect(
      validateMirrorResponse(
        feedback({ misconceptions: [{ learnerIdea: "x", correction: "  " }] }),
        SUPPLIED,
      ).ok,
    ).toBe(false);
  });

  it("rejects feedback with an empty improved explanation", () => {
    expect(
      validateMirrorResponse(feedback({ improvedExplanation: "   " }), SUPPLIED).ok,
    ).toBe(false);
  });

  it("rejects feedback that claims insufficient knowledge", () => {
    expect(
      validateMirrorResponse(feedback({ knowledgeSufficient: false }), SUPPLIED).ok,
    ).toBe(false);
  });

  it("rejects feedback with a not-evaluated recommendation", () => {
    expect(
      validateMirrorResponse(
        feedback({ masteryRecommendation: "not-evaluated" }),
        SUPPLIED,
      ).ok,
    ).toBe(false);
  });

  describe("insufficient-knowledge consistency", () => {
    const base = {
      responseMode: "insufficient-knowledge",
      knowledgeSufficient: false,
      masteryRecommendation: "not-evaluated",
      usedSourceIds: [],
      improvedExplanation: "",
      correctUnderstanding: [],
      missingPoints: [],
      misconceptions: [],
      nextAction: "continue-learning",
    };

    it("accepts a consistent insufficient-knowledge response", () => {
      const result = validateMirrorResponse(feedback(base), SUPPLIED);
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.masteryRecommendation).toBe("not-evaluated");
        expect(result.value.usedSourceIds).toEqual([]);
      }
    });

    it("rejects it when it claims sufficient knowledge", () => {
      expect(
        validateMirrorResponse(feedback({ ...base, knowledgeSufficient: true }), SUPPLIED)
          .ok,
      ).toBe(false);
    });

    it("rejects it when it recommends mastery", () => {
      expect(
        validateMirrorResponse(
          feedback({ ...base, masteryRecommendation: "understood" }),
          SUPPLIED,
        ).ok,
      ).toBe(false);
    });

    it("never displays a mastery claim or sources even if the model supplies them", () => {
      const result = validateMirrorResponse(
        feedback({
          ...base,
          usedSourceIds: ["doc-1:chunk:0"],
          correctUnderstanding: ["should be dropped"],
          misconceptions: [{ learnerIdea: "a", correction: "b" }],
        }),
        SUPPLIED,
      );
      expect(result.ok).toBe(true);
      if (result.ok) {
        expect(result.value.usedSourceIds).toEqual([]);
        expect(result.value.correctUnderstanding).toEqual([]);
        expect(result.value.misconceptions).toEqual([]);
      }
    });
  });

  describe("blocked consistency", () => {
    const base = {
      responseMode: "blocked",
      knowledgeSufficient: false,
      masteryRecommendation: "not-evaluated",
      usedSourceIds: [],
      improvedExplanation: "",
      correctUnderstanding: [],
      missingPoints: [],
      misconceptions: [],
      nextAction: "continue-learning",
    };

    it("accepts a consistent blocked response", () => {
      expect(validateMirrorResponse(feedback(base), SUPPLIED).ok).toBe(true);
    });

    it("rejects a blocked response that recommends mastery", () => {
      expect(
        validateMirrorResponse(
          feedback({ ...base, masteryRecommendation: "exploring" }),
          SUPPLIED,
        ).ok,
      ).toBe(false);
    });
  });
});
