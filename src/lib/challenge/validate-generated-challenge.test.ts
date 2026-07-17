import { describe, expect, it } from "vitest";
import {
  validateChallengeObject,
  validateGeneratedChallenge,
} from "./validate-generated-challenge";
import {
  MAX_CHALLENGE_PROMPT_LENGTH,
  MAX_REFERENCE_ANSWER_LENGTH,
} from "./constants";

const SUPPLIED = ["doc-1:chunk:0", "doc-1:chunk:1"];
const SERVER_ID = "server-generated-id";

function choice(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
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
    ...overrides,
  });
}

function freeResponse(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    challengeType: "explain-in-own-words",
    conceptTitle: "AI Hallucinations",
    difficulty: "intermediate",
    prompt: "Explain what an AI hallucination is.",
    instructions: "Answer in two or three sentences.",
    hint: "Consider how the model behaves when it does not know.",
    referenceAnswer: "Fluent output unsupported by the source.",
    essentialPoints: ["It sounds confident", "It is unsupported"],
    usedSourceIds: ["doc-1:chunk:0"],
    ...overrides,
  });
}

describe("validateGeneratedChallenge", () => {
  it("accepts a valid choice challenge", () => {
    const result = validateGeneratedChallenge(choice(), SUPPLIED, SERVER_ID);
    expect(result.ok).toBe(true);
    if (result.ok && "options" in result.value) {
      expect(result.value.options).toHaveLength(4);
      expect(result.value.correctOptionId).toBe("a");
      expect(result.value.usedSourceIds).toEqual(["doc-1:chunk:0"]);
    }
  });

  it("accepts a valid free-response challenge", () => {
    const result = validateGeneratedChallenge(freeResponse(), SUPPLIED, SERVER_ID);
    expect(result.ok).toBe(true);
    if (result.ok && "referenceAnswer" in result.value) {
      expect(result.value.referenceAnswer).toBe("Fluent output unsupported by the source.");
      expect(result.value.essentialPoints).toHaveLength(2);
    }
  });

  it("uses the server's challenge id and ignores any the model invents", () => {
    const result = validateGeneratedChallenge(
      choice({ challengeId: "model-invented-id" }),
      SUPPLIED,
      SERVER_ID,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.challengeId).toBe(SERVER_ID);
  });

  it("requires exactly four options for a choice challenge", () => {
    const threeOptions = [
      { id: "a", text: "One" },
      { id: "b", text: "Two" },
      { id: "c", text: "Three" },
    ];
    expect(
      validateGeneratedChallenge(choice({ options: threeOptions }), SUPPLIED, SERVER_ID)
        .ok,
    ).toBe(false);
    expect(
      validateGeneratedChallenge(
        choice({ options: [...threeOptions, { id: "d", text: "Four" }, { id: "e", text: "Five" }] }),
        SUPPLIED,
        SERVER_ID,
      ).ok,
    ).toBe(false);
  });

  it("rejects duplicate option ids", () => {
    expect(
      validateGeneratedChallenge(
        choice({
          options: [
            { id: "a", text: "One" },
            { id: "a", text: "Two" },
            { id: "c", text: "Three" },
            { id: "d", text: "Four" },
          ],
        }),
        SUPPLIED,
        SERVER_ID,
      ).ok,
    ).toBe(false);
  });

  it("rejects a correctOptionId that matches no option", () => {
    expect(
      validateGeneratedChallenge(choice({ correctOptionId: "z" }), SUPPLIED, SERVER_ID)
        .ok,
    ).toBe(false);
  });

  it("rejects an empty option", () => {
    expect(
      validateGeneratedChallenge(
        choice({
          options: [
            { id: "a", text: "   " },
            { id: "b", text: "Two" },
            { id: "c", text: "Three" },
            { id: "d", text: "Four" },
          ],
        }),
        SUPPLIED,
        SERVER_ID,
      ).ok,
    ).toBe(false);
  });

  it("rejects an unknown challenge type", () => {
    expect(
      validateGeneratedChallenge(choice({ challengeType: "essay" }), SUPPLIED, SERVER_ID)
        .ok,
    ).toBe(false);
  });

  it("rejects an invalid difficulty", () => {
    expect(
      validateGeneratedChallenge(choice({ difficulty: "expert" }), SUPPLIED, SERVER_ID)
        .ok,
    ).toBe(false);
  });

  it("rejects an excessive prompt", () => {
    expect(
      validateGeneratedChallenge(
        choice({ prompt: "x".repeat(MAX_CHALLENGE_PROMPT_LENGTH + 1) }),
        SUPPLIED,
        SERVER_ID,
      ).ok,
    ).toBe(false);
  });

  it("rejects an excessive reference answer", () => {
    expect(
      validateGeneratedChallenge(
        freeResponse({ referenceAnswer: "x".repeat(MAX_REFERENCE_ANSWER_LENGTH + 1) }),
        SUPPLIED,
        SERVER_ID,
      ).ok,
    ).toBe(false);
  });

  it("rejects more than five essential points", () => {
    expect(
      validateGeneratedChallenge(
        freeResponse({ essentialPoints: ["a", "b", "c", "d", "e", "f"] }),
        SUPPLIED,
        SERVER_ID,
      ).ok,
    ).toBe(false);
  });

  it("rejects a missing hint", () => {
    expect(
      validateGeneratedChallenge(choice({ hint: "  " }), SUPPLIED, SERVER_ID).ok,
    ).toBe(false);
  });

  it("removes unknown (invented) source ids", () => {
    const result = validateGeneratedChallenge(
      choice({ usedSourceIds: ["doc-1:chunk:0", "invented:chunk:9"] }),
      SUPPLIED,
      SERVER_ID,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.usedSourceIds).toEqual(["doc-1:chunk:0"]);
      expect(result.value.usedSourceIds).not.toContain("invented:chunk:9");
    }
  });

  it("removes duplicate source ids", () => {
    const result = validateGeneratedChallenge(
      choice({ usedSourceIds: ["doc-1:chunk:0", "doc-1:chunk:0", "doc-1:chunk:1"] }),
      SUPPLIED,
      SERVER_ID,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.usedSourceIds).toEqual(["doc-1:chunk:0", "doc-1:chunk:1"]);
    }
  });

  it("rejects empty, malformed, or non-object output", () => {
    expect(validateGeneratedChallenge(undefined, SUPPLIED, SERVER_ID).ok).toBe(false);
    expect(validateGeneratedChallenge("  ", SUPPLIED, SERVER_ID).ok).toBe(false);
    expect(validateGeneratedChallenge("{not json", SUPPLIED, SERVER_ID).ok).toBe(false);
    expect(validateGeneratedChallenge("[]", SUPPLIED, SERVER_ID).ok).toBe(false);
  });
});

describe("validateChallengeObject (client-held state is untrusted)", () => {
  it("re-validates a challenge sent back by the browser", () => {
    const generated = validateGeneratedChallenge(choice(), SUPPLIED, SERVER_ID);
    expect(generated.ok).toBe(true);
    if (!generated.ok) return;

    const result = validateChallengeObject(generated.value, SUPPLIED);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.challengeId).toBe(SERVER_ID);
  });

  it("rejects a challenge with no id", () => {
    expect(validateChallengeObject({ challengeType: "multiple-choice" }, SUPPLIED).ok).toBe(
      false,
    );
  });

  it("rejects a tampered challenge whose correct option no longer exists", () => {
    const generated = validateGeneratedChallenge(choice(), SUPPLIED, SERVER_ID);
    if (!generated.ok) throw new Error("fixture failed");
    const tampered = { ...generated.value, correctOptionId: "z" };
    expect(validateChallengeObject(tampered, SUPPLIED).ok).toBe(false);
  });

  it("strips source ids a tampered challenge claims but were not supplied", () => {
    const generated = validateGeneratedChallenge(choice(), SUPPLIED, SERVER_ID);
    if (!generated.ok) throw new Error("fixture failed");
    const tampered = { ...generated.value, usedSourceIds: ["not:supplied:1"] };
    const result = validateChallengeObject(tampered, SUPPLIED);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.usedSourceIds).toEqual([]);
  });
});
