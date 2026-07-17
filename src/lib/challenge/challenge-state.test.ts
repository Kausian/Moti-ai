import { describe, expect, it } from "vitest";
import type {
  ChallengeEvaluationResult,
  ChatErrorPayload,
  ConversationMessage,
  ConversationSource,
  GeneratedMotiChallenge,
} from "@/lib/types";
import {
  deriveConceptTitle,
  isChallengeEligible,
  toChallengeSources,
} from "./eligibility";
import {
  attemptsRemaining,
  canRetry,
  challengeReducer,
  deriveChallengeStage,
  initialChallengeState,
  isAnswering,
  type ChallengeState,
} from "./challenge-state";
import { MAX_CHALLENGE_ATTEMPTS } from "./constants";

function source(overrides: Partial<ConversationSource> = {}): ConversationSource {
  return {
    id: "doc-1:chunk:0",
    documentId: "doc-1",
    documentTitle: "Responsible AI Guide",
    sectionHeading: "Hallucinations",
    content: "A hallucination is fluent output unsupported by the source.",
    chunkIndex: 0,
    ...overrides,
  };
}

function answer(overrides: Partial<ConversationMessage> = {}): ConversationMessage {
  return {
    id: "m1",
    role: "assistant",
    content: "A grounded answer.",
    createdAt: new Date(0).toISOString(),
    status: "complete",
    responseMode: "grounded-answer",
    sources: [source()],
    ...overrides,
  };
}

const CHALLENGE: GeneratedMotiChallenge = {
  challengeId: "c1",
  challengeType: "multiple-choice",
  conceptTitle: "Hallucinations",
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

function result(
  overrides: Partial<ChallengeEvaluationResult> = {},
): ChallengeEvaluationResult {
  return {
    challengeId: "c1",
    outcome: "incorrect",
    feedback: "Not quite.",
    correctUnderstanding: [],
    missingPoints: [],
    explanation: "A nudge.",
    masteryRecommendation: "exploring",
    usedSourceIds: ["doc-1:chunk:0"],
    nextAction: "retry",
    ...overrides,
  };
}

const ERROR: ChatErrorPayload = {
  code: "provider-error",
  message: "Moti could not reach the AI service.",
  retryable: true,
};

function openState(): ChallengeState {
  return challengeReducer(initialChallengeState, {
    type: "open",
    messageId: "m1",
    conceptTitle: "Hallucinations",
    sources: [source()],
    difficulty: "beginner",
  });
}

function withChallenge(): ChallengeState {
  return challengeReducer(openState(), { type: "generated", challenge: CHALLENGE });
}

describe("challenge eligibility", () => {
  it("accepts a completed grounded answer with a source", () => {
    expect(isChallengeEligible(answer())).toBe(true);
  });

  it("rejects an answer with no sources", () => {
    expect(isChallengeEligible(answer({ sources: [] }))).toBe(false);
    expect(isChallengeEligible(answer({ sources: undefined }))).toBe(false);
  });

  it("rejects pending and failed answers", () => {
    expect(isChallengeEligible(answer({ status: "sending" }))).toBe(false);
    expect(isChallengeEligible(answer({ status: "failed" }))).toBe(false);
  });

  it("rejects learner messages", () => {
    expect(isChallengeEligible(answer({ role: "user" }))).toBe(false);
  });

  it("rejects insufficient-knowledge and blocked answers", () => {
    expect(isChallengeEligible(answer({ responseMode: "insufficient-knowledge" }))).toBe(
      false,
    );
    expect(isChallengeEligible(answer({ responseMode: "blocked" }))).toBe(false);
  });

  it("derives the concept from the section heading first, then the document title", () => {
    expect(deriveConceptTitle([source({ sectionHeading: "Prompt Injection" })])).toBe(
      "Prompt Injection",
    );
    expect(deriveConceptTitle([source({ sectionHeading: undefined })])).toBe(
      "Responsible AI Guide",
    );
    expect(deriveConceptTitle([])).toBeNull();
  });

  it("maps only the answer's validated sources into the request payload", () => {
    expect(toChallengeSources([source()])).toEqual([
      {
        chunkId: "doc-1:chunk:0",
        documentId: "doc-1",
        documentTitle: "Responsible AI Guide",
        sectionHeading: "Hallucinations",
        chunkIndex: 0,
        content: "A hallucination is fluent output unsupported by the source.",
      },
    ]);
  });
});

describe("challengeReducer", () => {
  it("opening enters setup with no challenge and no attempts", () => {
    const state = openState();
    expect(state?.messageId).toBe("m1");
    expect(state?.challenge).toBeNull();
    expect(state?.attempts).toBe(0);
    expect(deriveChallengeStage(state)).toBe("setup");
  });

  it("generating enters the generating stage", () => {
    const state = challengeReducer(openState(), { type: "generate" });
    expect(state?.pending).toBe(true);
    expect(deriveChallengeStage(state)).toBe("generating");
  });

  it("a generated challenge enters answering", () => {
    const state = withChallenge();
    expect(state?.challenge).toEqual(CHALLENGE);
    expect(deriveChallengeStage(state)).toBe("answering");
  });

  it("submitting enters evaluating", () => {
    const state = challengeReducer(withChallenge(), { type: "submit" });
    expect(deriveChallengeStage(state)).toBe("evaluating");
  });

  it("an evaluation enters feedback and counts the attempt", () => {
    let state = challengeReducer(withChallenge(), { type: "select-option", optionId: "b" });
    state = challengeReducer(state, { type: "submit" });
    state = challengeReducer(state, { type: "evaluated", result: result() });
    expect(state?.attempts).toBe(1);
    expect(deriveChallengeStage(state)).toBe("feedback");
  });

  it("a correct answer completes the challenge", () => {
    let state = challengeReducer(withChallenge(), { type: "submit" });
    state = challengeReducer(state, {
      type: "evaluated",
      result: result({ outcome: "correct", nextAction: "try-another" }),
    });
    expect(deriveChallengeStage(state)).toBe("complete");
    expect(canRetry(state)).toBe(false);
  });

  it("exhausting attempts completes the challenge", () => {
    let state = withChallenge();
    for (let i = 0; i < MAX_CHALLENGE_ATTEMPTS; i += 1) {
      state = challengeReducer(state, { type: "submit" });
      state = challengeReducer(state, { type: "evaluated", result: result() });
    }
    expect(state?.attempts).toBe(MAX_CHALLENGE_ATTEMPTS);
    expect(attemptsRemaining(state)).toBe(0);
    expect(canRetry(state)).toBe(false);
    expect(deriveChallengeStage(state)).toBe("complete");
  });

  it("retry preserves the generated challenge", () => {
    let state = challengeReducer(withChallenge(), { type: "select-option", optionId: "b" });
    state = challengeReducer(state, { type: "submit" });
    state = challengeReducer(state, { type: "evaluated", result: result() });
    expect(canRetry(state)).toBe(true);

    state = challengeReducer(state, { type: "retry" });
    expect(state?.challenge).toEqual(CHALLENGE);
    expect(state?.result).toBeNull();
    expect(state?.attempts).toBe(1);
    expect(deriveChallengeStage(state)).toBe("answering");
  });

  it("a failure preserves the challenge and the learner's answer", () => {
    let state = challengeReducer(withChallenge(), { type: "select-option", optionId: "b" });
    state = challengeReducer(state, { type: "submit" });
    state = challengeReducer(state, { type: "failure", error: ERROR });

    expect(state?.pending).toBe(false);
    expect(state?.error).toEqual(ERROR);
    expect(state?.challenge).toEqual(CHALLENGE);
    expect(state?.selectedOptionId).toBe("b");
  });

  it("cancelling leaves no error and keeps the answer", () => {
    let state = challengeReducer(withChallenge(), { type: "select-option", optionId: "b" });
    state = challengeReducer(state, { type: "submit" });
    state = challengeReducer(state, { type: "cancel" });

    expect(state?.pending).toBe(false);
    expect(state?.error).toBeNull();
    expect(state?.result).toBeNull();
    expect(state?.selectedOptionId).toBe("b");
  });

  it("revealing the answer completes the challenge", () => {
    const state = challengeReducer(withChallenge(), { type: "reveal" });
    expect(state?.revealed).toBe(true);
    expect(deriveChallengeStage(state)).toBe("complete");
    expect(canRetry(state)).toBe(false);
  });

  it("a new challenge resets attempts and the previous answer", () => {
    let state = challengeReducer(withChallenge(), { type: "select-option", optionId: "b" });
    state = challengeReducer(state, { type: "submit" });
    state = challengeReducer(state, { type: "evaluated", result: result() });
    state = challengeReducer(state, {
      type: "generated",
      challenge: { ...CHALLENGE, challengeId: "c2" },
    });

    expect(state?.attempts).toBe(0);
    expect(state?.selectedOptionId).toBeNull();
    expect(state?.result).toBeNull();
    expect(state?.revealed).toBe(false);
  });

  it("close resets the activity", () => {
    expect(challengeReducer(withChallenge(), { type: "close" })).toBeNull();
  });

  it("ignores actions when no activity is open", () => {
    expect(challengeReducer(null, { type: "submit" })).toBeNull();
    expect(challengeReducer(null, { type: "select-option", optionId: "a" })).toBeNull();
  });
});

describe("isAnswering", () => {
  it("is true during setup and while answering, false while pending or done", () => {
    expect(isAnswering(null)).toBe(false);
    expect(isAnswering(openState())).toBe(true);
    expect(isAnswering(withChallenge())).toBe(true);
    expect(isAnswering(challengeReducer(withChallenge(), { type: "submit" }))).toBe(false);
    expect(
      isAnswering(
        challengeReducer(withChallenge(), { type: "evaluated", result: result() }),
      ),
    ).toBe(false);
    expect(isAnswering(challengeReducer(withChallenge(), { type: "reveal" }))).toBe(false);
  });
});
