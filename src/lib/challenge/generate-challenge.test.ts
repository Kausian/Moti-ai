// Exercises the challenge generation/evaluation boundaries through injected
// `generate` mocks. No test here (or anywhere in this suite) calls the real
// Gemini API.

import { describe, expect, it, vi } from "vitest";
import type {
  EvaluateChallengeRequest,
  GenerateChallengeRequest,
  GeneratedChoiceChallenge,
  GeneratedFreeResponseChallenge,
} from "@/lib/types";
import { AiError } from "@/lib/ai/error-mapping";
import { generateChallenge } from "./generate-challenge";
import { evaluateChallenge } from "./evaluate-challenge";

const SOURCE = {
  chunkId: "doc-1:chunk:0",
  documentId: "doc-1",
  documentTitle: "Responsible AI Guide",
  sectionHeading: "Hallucinations",
  chunkIndex: 0,
  content: "A hallucination is fluent output unsupported by the source.",
};

const GENERATE_REQUEST: GenerateChallengeRequest = {
  conceptTitle: "AI Hallucinations",
  requestedType: "multiple-choice",
  difficulty: "beginner",
  course: {
    title: "Responsible AI",
    learnerLevel: "beginner",
    learningObjective: "Spot unreliable AI answers.",
    assistantInstructions: "Be warm.",
  },
  sources: [SOURCE],
};

function generatedPayload(overrides: Record<string, unknown> = {}) {
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

describe("generateChallenge", () => {
  it("returns a validated challenge with a server-generated id", async () => {
    const generate = vi.fn().mockResolvedValue({ text: generatedPayload() });
    const challenge = await generateChallenge(GENERATE_REQUEST, {
      signal: new AbortController().signal,
      generate,
      newChallengeId: () => "server-id",
    });

    expect(challenge.challengeId).toBe("server-id");
    expect(challenge.challengeType).toBe("multiple-choice");
    expect(generate).toHaveBeenCalledOnce();
  });

  it("ignores a challenge id invented by the model", async () => {
    const generate = vi
      .fn()
      .mockResolvedValue({ text: generatedPayload({ challengeId: "model-id" }) });
    const challenge = await generateChallenge(GENERATE_REQUEST, {
      signal: new AbortController().signal,
      generate,
      newChallengeId: () => "server-id",
    });
    expect(challenge.challengeId).toBe("server-id");
  });

  it("sends a layered system instruction and exactly one grounded turn (no history)", async () => {
    const generate = vi.fn().mockResolvedValue({ text: generatedPayload() });
    await generateChallenge(GENERATE_REQUEST, {
      signal: new AbortController().signal,
      generate,
    });

    const params = generate.mock.calls[0][0];
    expect(params.systemInstruction).toContain("CHALLENGE TYPE — multiple-choice");
    expect(params.systemInstruction).toContain("DIFFICULTY — beginner");
    expect(params.contents).toHaveLength(1);
    expect(params.contents[0].parts[0].text).toContain("<provided_sources>");
  });

  it("throws a safety AiError when the provider blocks the response", async () => {
    const generate = vi.fn().mockResolvedValue({ text: undefined, blockReason: "SAFETY" });
    await expect(
      generateChallenge(GENERATE_REQUEST, {
        signal: new AbortController().signal,
        generate,
      }),
    ).rejects.toThrow(AiError);
  });

  it("throws a malformed AiError when the output fails validation", async () => {
    const generate = vi.fn().mockResolvedValue({ text: "{not json" });
    await expect(
      generateChallenge(GENERATE_REQUEST, {
        signal: new AbortController().signal,
        generate,
      }),
    ).rejects.toThrow(AiError);
  });

  it("strips invented source ids before they can reach the client", async () => {
    const generate = vi
      .fn()
      .mockResolvedValue({ text: generatedPayload({ usedSourceIds: ["made:up"] }) });
    const challenge = await generateChallenge(GENERATE_REQUEST, {
      signal: new AbortController().signal,
      generate,
    });
    expect(challenge.usedSourceIds).toEqual([]);
  });
});

const CHOICE: GeneratedChoiceChallenge = {
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

const FREE: GeneratedFreeResponseChallenge = {
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

function evaluateRequest(
  overrides: Partial<EvaluateChallengeRequest> = {},
): EvaluateChallengeRequest {
  return {
    challenge: CHOICE,
    learnerResponse: { selectedOptionId: "a" },
    attemptNumber: 1,
    course: { learnerLevel: "beginner", assistantInstructions: "Be warm." },
    sources: [SOURCE],
    ...overrides,
  };
}

describe("evaluateChallenge", () => {
  it("marks a choice challenge without ever calling Gemini", async () => {
    const generate = vi.fn();
    const result = await evaluateChallenge(evaluateRequest(), {
      signal: new AbortController().signal,
      generate,
    });

    expect(result.outcome).toBe("correct");
    expect(result.masteryRecommendation).toBe("understood");
    // The decisive assertion: no model was involved in comparing two option ids.
    expect(generate).not.toHaveBeenCalled();
  });

  it("marks a wrong choice as incorrect without calling Gemini", async () => {
    const generate = vi.fn();
    const result = await evaluateChallenge(
      evaluateRequest({ learnerResponse: { selectedOptionId: "b" } }),
      { signal: new AbortController().signal, generate },
    );
    expect(result.outcome).toBe("incorrect");
    expect(result.masteryRecommendation).toBe("exploring");
    expect(generate).not.toHaveBeenCalled();
  });

  it("calls Gemini for a free-response answer", async () => {
    const generate = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        outcome: "correct",
        feedback: "You captured the central idea.",
        correctUnderstanding: ["It sounds confident but is unsupported."],
        missingPoints: [],
        explanation: "Fluent output unsupported by the source.",
        usedSourceIds: ["doc-1:chunk:0"],
      }),
    });

    const result = await evaluateChallenge(
      evaluateRequest({
        challenge: FREE,
        learnerResponse: { writtenAnswer: "Confident but unsupported output." },
      }),
      { signal: new AbortController().signal, generate },
    );

    expect(generate).toHaveBeenCalledOnce();
    expect(result.outcome).toBe("correct");
    expect(result.masteryRecommendation).toBe("understood");
    expect(generate.mock.calls[0][0].contents[0].parts[0].text).toContain(
      "<learner_answer>",
    );
  });

  it("applies the server's attempt policy over the model's marking", async () => {
    const generate = vi.fn().mockResolvedValue({
      text: JSON.stringify({
        outcome: "incorrect",
        feedback: "Not quite.",
        correctUnderstanding: [],
        missingPoints: ["The model keeps working."],
        explanation: "THE FULL ANSWER",
        usedSourceIds: ["doc-1:chunk:0"],
      }),
    });

    const result = await evaluateChallenge(
      evaluateRequest({
        challenge: FREE,
        learnerResponse: { writtenAnswer: "It crashes the model." },
        attemptNumber: 1,
      }),
      { signal: new AbortController().signal, generate },
    );

    // A first failure withholds the full answer and offers a retry instead.
    expect(result.nextAction).toBe("retry");
    expect(result.explanation).toBe(FREE.hint);
    expect(result.explanation).not.toBe("THE FULL ANSWER");
    expect(result.masteryRecommendation).toBe("exploring");
  });

  it("throws a malformed AiError when free-response marking fails validation", async () => {
    const generate = vi.fn().mockResolvedValue({ text: "{not json" });
    await expect(
      evaluateChallenge(
        evaluateRequest({
          challenge: FREE,
          learnerResponse: { writtenAnswer: "Something." },
        }),
        { signal: new AbortController().signal, generate },
      ),
    ).rejects.toThrow(AiError);
  });
});
