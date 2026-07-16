import { describe, expect, it } from "vitest";
import { validateAiResponse } from "./validate-ai-response";

const SUPPLIED = ["s1", "s2"];

function json(value: Record<string, unknown>): string {
  return JSON.stringify(value);
}

const base = {
  responseMode: "grounded-answer",
  answer: "A grounded answer.",
  knowledgeSufficient: true,
  usedSourceIds: ["s1"],
  suggestedActions: ["explain-simply"],
};

describe("validateAiResponse", () => {
  it("accepts a valid structured response", () => {
    const result = validateAiResponse(json(base), SUPPLIED);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.responseMode).toBe("grounded-answer");
      expect(result.value.usedSourceIds).toEqual(["s1"]);
    }
  });

  it("rejects malformed JSON", () => {
    expect(validateAiResponse("{not valid", SUPPLIED).ok).toBe(false);
  });

  it("rejects empty output", () => {
    expect(validateAiResponse("   ", SUPPLIED).ok).toBe(false);
    expect(validateAiResponse(undefined, SUPPLIED).ok).toBe(false);
  });

  it("rejects missing required fields", () => {
    const { answer, ...withoutAnswer } = base;
    void answer;
    expect(validateAiResponse(json(withoutAnswer), SUPPLIED).ok).toBe(false);
    const { usedSourceIds, ...withoutIds } = base;
    void usedSourceIds;
    expect(validateAiResponse(json(withoutIds), SUPPLIED).ok).toBe(false);
  });

  it("rejects an unsupported response mode", () => {
    expect(validateAiResponse(json({ ...base, responseMode: "freeform" }), SUPPLIED).ok).toBe(
      false,
    );
  });

  it("rejects an empty answer", () => {
    expect(validateAiResponse(json({ ...base, answer: "   " }), SUPPLIED).ok).toBe(false);
  });

  it("rejects an over-length answer", () => {
    expect(
      validateAiResponse(json({ ...base, answer: "x".repeat(1501) }), SUPPLIED).ok,
    ).toBe(false);
  });

  it("removes unknown source ids", () => {
    const result = validateAiResponse(
      json({ ...base, usedSourceIds: ["s1", "unknown-id"] }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.usedSourceIds).toEqual(["s1"]);
  });

  it("removes duplicate source ids", () => {
    const result = validateAiResponse(
      json({ ...base, usedSourceIds: ["s1", "s1", "s2"] }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.usedSourceIds).toEqual(["s1", "s2"]);
  });

  it("removes invalid suggested actions", () => {
    const result = validateAiResponse(
      json({ ...base, suggestedActions: ["explain-simply", "dance", "give-example"] }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.suggestedActions).toEqual(["explain-simply", "give-example"]);
    }
  });

  it("clears used source ids when knowledge is insufficient", () => {
    const result = validateAiResponse(
      json({
        ...base,
        responseMode: "insufficient-knowledge",
        knowledgeSufficient: false,
        usedSourceIds: ["s1", "s2"],
      }),
      SUPPLIED,
    );
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.usedSourceIds).toEqual([]);
  });

  it("is deterministic for the same input", () => {
    const first = validateAiResponse(json(base), SUPPLIED);
    const second = validateAiResponse(json(base), SUPPLIED);
    expect(first).toEqual(second);
  });
});
