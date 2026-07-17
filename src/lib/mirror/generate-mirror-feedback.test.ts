// Exercises the teach-back generation boundary through an injected `generate`
// mock. No test here (or anywhere in this suite) calls the real Gemini API.

import { describe, expect, it, vi } from "vitest";
import type { MotiMirrorRequest } from "@/lib/types";
import { AiError } from "@/lib/ai/error-mapping";
import { generateMirrorFeedback } from "./generate-mirror-feedback";

const REQUEST: MotiMirrorRequest = {
  conceptTitle: "AI Hallucinations",
  learnerExplanation: "A confident answer unsupported by the material.",
  course: {
    title: "Responsible AI",
    learnerLevel: "beginner",
    learningObjective: "Spot unreliable AI answers.",
    assistantInstructions: "Be warm.",
  },
  sources: [
    {
      chunkId: "doc-1:chunk:0",
      documentId: "doc-1",
      documentTitle: "Responsible AI Guide",
      sectionHeading: "Hallucinations",
      chunkIndex: 0,
      content: "A hallucination is fluent output unsupported by the source.",
    },
  ],
};

function validPayload(overrides: Record<string, unknown> = {}) {
  return JSON.stringify({
    responseMode: "teach-back-feedback",
    conceptTitle: "AI Hallucinations",
    knowledgeSufficient: true,
    feedbackSummary: "Good start.",
    correctUnderstanding: ["You spotted it can be wrong."],
    missingPoints: [],
    misconceptions: [],
    improvedExplanation: "Fluent output unsupported by the source.",
    masteryRecommendation: "developing",
    masteryRationale: "Partly there.",
    usedSourceIds: ["doc-1:chunk:0"],
    nextAction: "retry-teach-back",
    ...overrides,
  });
}

describe("generateMirrorFeedback", () => {
  it("returns validated feedback from the model", async () => {
    const generate = vi.fn().mockResolvedValue({ text: validPayload() });
    const result = await generateMirrorFeedback(REQUEST, {
      signal: new AbortController().signal,
      generate,
    });

    expect(result.masteryRecommendation).toBe("developing");
    expect(result.usedSourceIds).toEqual(["doc-1:chunk:0"]);
    expect(generate).toHaveBeenCalledOnce();
  });

  it("sends a system instruction and exactly one grounded user turn (no history)", async () => {
    const generate = vi.fn().mockResolvedValue({ text: validPayload() });
    await generateMirrorFeedback(REQUEST, {
      signal: new AbortController().signal,
      generate,
    });

    const params = generate.mock.calls[0][0];
    expect(params.systemInstruction).toContain("EVALUATION RUBRIC");
    expect(params.contents).toHaveLength(1);
    expect(params.contents[0].parts[0].text).toContain("<learner_explanation>");
  });

  it("throws a safety AiError when the provider blocks the response", async () => {
    const generate = vi.fn().mockResolvedValue({ text: undefined, blockReason: "SAFETY" });
    await expect(
      generateMirrorFeedback(REQUEST, {
        signal: new AbortController().signal,
        generate,
      }),
    ).rejects.toThrow(AiError);
  });

  it("throws a malformed AiError when the model output fails validation", async () => {
    const generate = vi.fn().mockResolvedValue({ text: "{not json" });
    await expect(
      generateMirrorFeedback(REQUEST, {
        signal: new AbortController().signal,
        generate,
      }),
    ).rejects.toThrow(AiError);
  });

  it("rejects invented source ids before they can reach the client", async () => {
    const generate = vi.fn().mockResolvedValue({
      text: validPayload({ usedSourceIds: ["totally:made:up"] }),
    });
    const result = await generateMirrorFeedback(REQUEST, {
      signal: new AbortController().signal,
      generate,
    });
    expect(result.usedSourceIds).toEqual([]);
  });
});
