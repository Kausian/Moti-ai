import { describe, expect, it } from "vitest";
import type { GeneratedChoiceChallenge } from "@/lib/types";
import { applyAttemptPolicy, evaluateChoiceChallenge } from "./attempt-policy";
import { MAX_CHALLENGE_ATTEMPTS } from "./constants";

const CHALLENGE: GeneratedChoiceChallenge = {
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

describe("applyAttemptPolicy", () => {
  it("recommends understood for a first-attempt correct answer", () => {
    const policy = applyAttemptPolicy({
      outcome: "correct",
      attemptNumber: 1,
      hint: "h",
      fullExplanation: "full",
    });
    expect(policy.masteryRecommendation).toBe("understood");
    expect(policy.nextAction).toBe("try-another");
    expect(policy.explanation).toBe("full");
    expect(policy.revealed).toBe(true);
  });

  it("recommends developing for a correct answer that needed a retry", () => {
    const policy = applyAttemptPolicy({
      outcome: "correct",
      attemptNumber: 2,
      hint: "h",
      fullExplanation: "full",
    });
    expect(policy.masteryRecommendation).toBe("developing");
    expect(policy.nextAction).toBe("try-another");
  });

  it("offers a hint and a retry after a first incorrect attempt", () => {
    const policy = applyAttemptPolicy({
      outcome: "incorrect",
      attemptNumber: 1,
      hint: "the hint",
      fullExplanation: "the full answer",
    });
    expect(policy.nextAction).toBe("retry");
    expect(policy.masteryRecommendation).toBe("exploring");
    // The answer is withheld while a retry is still useful.
    expect(policy.explanation).toBe("the hint");
    expect(policy.explanation).not.toContain("the full answer");
    expect(policy.revealed).toBe(false);
  });

  it("reveals the full explanation and recommends the source on the last attempt", () => {
    const policy = applyAttemptPolicy({
      outcome: "incorrect",
      attemptNumber: MAX_CHALLENGE_ATTEMPTS,
      hint: "the hint",
      fullExplanation: "the full answer",
    });
    expect(policy.nextAction).toBe("review-source");
    expect(policy.explanation).toBe("the full answer");
    expect(policy.revealed).toBe(true);
  });

  it("recommends developing for a partially correct answer", () => {
    expect(
      applyAttemptPolicy({
        outcome: "partially-correct",
        attemptNumber: 1,
        hint: "h",
        fullExplanation: "f",
      }).masteryRecommendation,
    ).toBe("developing");
    expect(
      applyAttemptPolicy({
        outcome: "partially-correct",
        attemptNumber: 2,
        hint: "h",
        fullExplanation: "f",
      }).nextAction,
    ).toBe("review-source");
  });

  it("makes no mastery claim and gives no explanation when not evaluated", () => {
    const policy = applyAttemptPolicy({
      outcome: "not-evaluated",
      attemptNumber: 1,
      hint: "h",
      fullExplanation: "f",
    });
    expect(policy.masteryRecommendation).toBe("not-evaluated");
    expect(policy.nextAction).toBe("continue");
    expect(policy.explanation).toBe("");
  });

  it("never awards understood for a non-correct outcome, at any attempt", () => {
    for (const outcome of ["incorrect", "partially-correct", "not-evaluated"] as const) {
      for (const attemptNumber of [1, 2]) {
        expect(
          applyAttemptPolicy({ outcome, attemptNumber, hint: "h", fullExplanation: "f" })
            .masteryRecommendation,
        ).not.toBe("understood");
      }
    }
  });

  it("is deterministic and finite", () => {
    const once = applyAttemptPolicy({
      outcome: "incorrect",
      attemptNumber: 1,
      hint: "h",
      fullExplanation: "f",
    });
    const twice = applyAttemptPolicy({
      outcome: "incorrect",
      attemptNumber: 1,
      hint: "h",
      fullExplanation: "f",
    });
    expect(once).toEqual(twice);
  });
});

describe("evaluateChoiceChallenge (deterministic — no Gemini call)", () => {
  it("marks the correct option as correct", () => {
    const result = evaluateChoiceChallenge({
      challenge: CHALLENGE,
      selectedOptionId: "a",
      attemptNumber: 1,
    });
    expect(result.outcome).toBe("correct");
    expect(result.masteryRecommendation).toBe("understood");
    expect(result.nextAction).toBe("try-another");
    expect(result.explanation).toBe(CHALLENGE.referenceExplanation);
  });

  it("marks a wrong option as incorrect", () => {
    const result = evaluateChoiceChallenge({
      challenge: CHALLENGE,
      selectedOptionId: "b",
      attemptNumber: 1,
    });
    expect(result.outcome).toBe("incorrect");
    expect(result.masteryRecommendation).toBe("exploring");
  });

  it("offers a retry after a first wrong answer and withholds the explanation", () => {
    const result = evaluateChoiceChallenge({
      challenge: CHALLENGE,
      selectedOptionId: "b",
      attemptNumber: 1,
    });
    expect(result.nextAction).toBe("retry");
    expect(result.explanation).toBe(CHALLENGE.hint);
    expect(result.explanation).not.toBe(CHALLENGE.referenceExplanation);
  });

  it("recommends reviewing the source after the second wrong answer", () => {
    const result = evaluateChoiceChallenge({
      challenge: CHALLENGE,
      selectedOptionId: "b",
      attemptNumber: 2,
    });
    expect(result.nextAction).toBe("review-source");
    expect(result.explanation).toBe(CHALLENGE.referenceExplanation);
  });

  it("a wrong answer never earns an understood recommendation", () => {
    for (const attemptNumber of [1, 2]) {
      const result = evaluateChoiceChallenge({
        challenge: CHALLENGE,
        selectedOptionId: "d",
        attemptNumber,
      });
      expect(result.outcome).not.toBe("correct");
      expect(result.masteryRecommendation).not.toBe("understood");
    }
  });

  it("uses only the challenge's already-validated source ids", () => {
    const result = evaluateChoiceChallenge({
      challenge: CHALLENGE,
      selectedOptionId: "a",
      attemptNumber: 1,
    });
    expect(result.usedSourceIds).toEqual(["doc-1:chunk:0"]);
  });

  it("is deterministic for the same input", () => {
    const once = evaluateChoiceChallenge({
      challenge: CHALLENGE,
      selectedOptionId: "a",
      attemptNumber: 1,
    });
    const twice = evaluateChoiceChallenge({
      challenge: CHALLENGE,
      selectedOptionId: "a",
      attemptNumber: 1,
    });
    expect(once).toEqual(twice);
  });
});
