import { describe, expect, it } from "vitest";
import type {
  ChallengeEvaluationResult,
  ConversationSource,
  GeneratedChoiceChallenge,
  MotiMirrorStructuredResponse,
} from "@/lib/types";
import {
  buildChallengeOutcomeInput,
  buildMirrorOutcomeInput,
  challengeActivityId,
} from "./outcome-input";

const SOURCES: ConversationSource[] = [
  {
    id: "doc-1:chunk:0",
    documentId: "doc-1",
    documentTitle: "Responsible AI Guide",
    sectionHeading: "AI Hallucinations",
    content: "SECRET SOURCE EXCERPT that must never be persisted.",
    chunkIndex: 0,
  },
];

function feedback(
  overrides: Partial<MotiMirrorStructuredResponse> = {},
): MotiMirrorStructuredResponse {
  return {
    responseMode: "teach-back-feedback",
    conceptTitle: "AI Hallucinations",
    knowledgeSufficient: true,
    feedbackSummary: "FULL AI FEEDBACK that must never be persisted.",
    correctUnderstanding: ["Detailed coaching that must never be persisted."],
    missingPoints: [],
    misconceptions: [],
    improvedExplanation: "A long improved explanation that must never be persisted.",
    masteryRecommendation: "developing",
    masteryRationale: "Rationale that must never be persisted.",
    usedSourceIds: ["doc-1:chunk:0"],
    nextAction: "retry-teach-back",
    memoryEchoPrompt: "Why can a confident AI answer still be unreliable?",
    ...overrides,
  };
}

const CHALLENGE: GeneratedChoiceChallenge = {
  challengeId: "chal-1",
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
  referenceExplanation: "ANSWER KEY that must never be persisted.",
  usedSourceIds: ["doc-1:chunk:0"],
};

function result(
  overrides: Partial<ChallengeEvaluationResult> = {},
): ChallengeEvaluationResult {
  return {
    challengeId: "chal-1",
    outcome: "correct",
    feedback: "FULL FEEDBACK that must never be persisted.",
    correctUnderstanding: [],
    missingPoints: [],
    explanation: "EXPLANATION that must never be persisted.",
    masteryRecommendation: "understood",
    usedSourceIds: ["doc-1:chunk:0"],
    nextAction: "try-another",
    memoryEchoPrompt: "How should you treat an unverified AI answer?",
    ...overrides,
  };
}

describe("challengeActivityId", () => {
  it("is stable and includes both the challenge and the attempt", () => {
    expect(challengeActivityId("chal-1", 1)).toBe("chal-1:attempt:1");
    expect(challengeActivityId("chal-1", 2)).toBe("chal-1:attempt:2");
    // Deterministic — the same attempt always maps to the same id.
    expect(challengeActivityId("chal-1", 1)).toBe(challengeActivityId("chal-1", 1));
  });
});

describe("buildMirrorOutcomeInput", () => {
  it("builds a saveable outcome from valid feedback", () => {
    const input = buildMirrorOutcomeInput({
      activityId: "mirror-1",
      courseId: "course-1",
      feedback: feedback(),
      sources: SOURCES,
    });

    expect(input).not.toBeNull();
    expect(input?.activityType).toBe("moti-mirror");
    expect(input?.masteryRecommendation).toBe("developing");
    expect(input?.sourceDocumentId).toBe("doc-1");
    expect(input?.sourceIds).toEqual(["doc-1:chunk:0"]);
    expect(input?.memoryEchoPrompt).toBe(
      "Why can a confident AI answer still be unreliable?",
    );
  });

  it("is not saveable when the result was not evaluated", () => {
    expect(
      buildMirrorOutcomeInput({
        activityId: "mirror-1",
        courseId: "course-1",
        feedback: feedback({ masteryRecommendation: "not-evaluated" }),
        sources: SOURCES,
      }),
    ).toBeNull();
  });

  it("is not saveable for insufficient-knowledge or blocked results", () => {
    for (const responseMode of ["insufficient-knowledge", "blocked"] as const) {
      expect(
        buildMirrorOutcomeInput({
          activityId: "mirror-1",
          courseId: "course-1",
          feedback: feedback({ responseMode, masteryRecommendation: "not-evaluated" }),
          sources: SOURCES,
        }),
      ).toBeNull();
    }
  });

  it("is not saveable with no sources", () => {
    expect(
      buildMirrorOutcomeInput({
        activityId: "mirror-1",
        courseId: "course-1",
        feedback: feedback(),
        sources: [],
      }),
    ).toBeNull();
  });
});

describe("buildChallengeOutcomeInput", () => {
  it("builds a saveable outcome with a stable attempt-scoped id", () => {
    const input = buildChallengeOutcomeInput({
      courseId: "course-1",
      challenge: CHALLENGE,
      result: result(),
      attemptNumber: 1,
      sources: SOURCES,
    });

    expect(input?.activityId).toBe("chal-1:attempt:1");
    expect(input?.activityType).toBe("micro-challenge");
    expect(input?.challengeOutcome).toBe("correct");
    expect(input?.attemptNumber).toBe(1);
    expect(input?.masteryRecommendation).toBe("understood");
  });

  it("saves the validated recommendation, not a status implied by celebration", () => {
    const input = buildChallengeOutcomeInput({
      courseId: "course-1",
      challenge: CHALLENGE,
      result: result({
        outcome: "partially-correct",
        masteryRecommendation: "developing",
      }),
      attemptNumber: 2,
      sources: SOURCES,
    });
    expect(input?.masteryRecommendation).toBe("developing");
    expect(input?.challengeOutcome).toBe("partially-correct");
  });

  it("is not saveable when the challenge was not evaluated", () => {
    expect(
      buildChallengeOutcomeInput({
        courseId: "course-1",
        challenge: CHALLENGE,
        result: result({ outcome: "not-evaluated", masteryRecommendation: "not-evaluated" }),
        attemptNumber: 1,
        sources: SOURCES,
      }),
    ).toBeNull();
  });

  it("is not saveable with no sources", () => {
    expect(
      buildChallengeOutcomeInput({
        courseId: "course-1",
        challenge: CHALLENGE,
        result: result(),
        attemptNumber: 1,
        sources: [],
      }),
    ).toBeNull();
  });
});

describe("the privacy boundary", () => {
  it("never carries learner text, full feedback, or source excerpts into a Mirror save", () => {
    const input = buildMirrorOutcomeInput({
      activityId: "mirror-1",
      courseId: "course-1",
      feedback: feedback(),
      sources: SOURCES,
    });
    const serialized = JSON.stringify(input);

    // Everything that must stay out of localStorage.
    expect(serialized).not.toContain("SECRET SOURCE EXCERPT");
    expect(serialized).not.toContain("FULL AI FEEDBACK");
    expect(serialized).not.toContain("Detailed coaching");
    expect(serialized).not.toContain("improved explanation");
    expect(serialized).not.toContain("Rationale");

    // The payload's shape is closed to free text by construction.
    expect(Object.keys(input ?? {}).sort()).toEqual([
      "activityId",
      "activityType",
      "conceptTitle",
      "courseId",
      "masteryRecommendation",
      "memoryEchoPrompt",
      "sectionHeading",
      "sourceDocumentId",
      "sourceDocumentTitle",
      "sourceIds",
    ]);
  });

  it("never carries the written answer, answer key, or full feedback into a challenge save", () => {
    const input = buildChallengeOutcomeInput({
      courseId: "course-1",
      challenge: CHALLENGE,
      result: result(),
      attemptNumber: 1,
      sources: SOURCES,
    });
    const serialized = JSON.stringify(input);

    expect(serialized).not.toContain("SECRET SOURCE EXCERPT");
    expect(serialized).not.toContain("FULL FEEDBACK");
    expect(serialized).not.toContain("EXPLANATION that must never");
    expect(serialized).not.toContain("ANSWER KEY");
    // The challenge's own prompt and options are not learning metadata.
    expect(serialized).not.toContain("What is an AI hallucination?");
    expect(serialized).not.toContain("The model crashing.");
  });
});
