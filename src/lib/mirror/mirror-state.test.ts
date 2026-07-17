import { describe, expect, it } from "vitest";
import type {
  ChatErrorPayload,
  ConversationMessage,
  ConversationSource,
  MotiMirrorStructuredResponse,
} from "@/lib/types";
import {
  deriveConceptTitle,
  isTeachBackEligible,
  toTeachBackSources,
} from "./eligibility";
import {
  deriveLoopStage,
  initialMirrorState,
  isDrafting,
  mirrorReducer,
  type MirrorState,
} from "./mirror-state";

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

const FEEDBACK: MotiMirrorStructuredResponse = {
  responseMode: "teach-back-feedback",
  conceptTitle: "Hallucinations",
  knowledgeSufficient: true,
  feedbackSummary: "Good start.",
  correctUnderstanding: [],
  missingPoints: [],
  misconceptions: [],
  improvedExplanation: "A clearer explanation.",
  masteryRecommendation: "developing",
  masteryRationale: "Partly there.",
  usedSourceIds: ["doc-1:chunk:0"],
  nextAction: "retry-teach-back",
  memoryEchoPrompt: "Why can a confident answer be unreliable?",
};

const ERROR: ChatErrorPayload = {
  code: "provider-error",
  message: "Moti could not reach the AI service.",
  retryable: true,
};

function openState(): MirrorState {
  return mirrorReducer(initialMirrorState, {
    type: "open",
    messageId: "m1",
    conceptTitle: "Hallucinations",
    sources: [source()],
  });
}

describe("teach-back eligibility", () => {
  it("accepts a completed grounded answer with a source", () => {
    expect(isTeachBackEligible(answer())).toBe(true);
  });

  it("rejects an answer with no sources", () => {
    expect(isTeachBackEligible(answer({ sources: [] }))).toBe(false);
    expect(isTeachBackEligible(answer({ sources: undefined }))).toBe(false);
  });

  it("rejects pending and failed messages", () => {
    expect(isTeachBackEligible(answer({ status: "sending" }))).toBe(false);
    expect(isTeachBackEligible(answer({ status: "failed" }))).toBe(false);
  });

  it("rejects learner messages", () => {
    expect(isTeachBackEligible(answer({ role: "user" }))).toBe(false);
  });

  it("rejects insufficient-knowledge and blocked responses", () => {
    expect(
      isTeachBackEligible(answer({ responseMode: "insufficient-knowledge" })),
    ).toBe(false);
    expect(isTeachBackEligible(answer({ responseMode: "blocked" }))).toBe(false);
    expect(
      isTeachBackEligible(answer({ responseMode: "clarifying-question" })),
    ).toBe(false);
  });

  it("rejects an answer whose source yields no usable concept title", () => {
    expect(
      isTeachBackEligible(
        answer({ sources: [source({ sectionHeading: "  ", documentTitle: "  " })] }),
      ),
    ).toBe(false);
  });
});

describe("deriveConceptTitle", () => {
  it("prefers the first source's section heading", () => {
    expect(deriveConceptTitle([source({ sectionHeading: "Prompt Injection" })])).toBe(
      "Prompt Injection",
    );
  });

  it("falls back to the document title when there is no heading", () => {
    expect(deriveConceptTitle([source({ sectionHeading: undefined })])).toBe(
      "Responsible AI Guide",
    );
    expect(deriveConceptTitle([source({ sectionHeading: "   " })])).toBe(
      "Responsible AI Guide",
    );
  });

  it("returns null when neither is usable", () => {
    expect(deriveConceptTitle([])).toBeNull();
    expect(
      deriveConceptTitle([source({ sectionHeading: "", documentTitle: "   " })]),
    ).toBeNull();
  });
});

describe("toTeachBackSources", () => {
  it("maps only the answer's validated sources to the request payload", () => {
    expect(toTeachBackSources([source()])).toEqual([
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

describe("mirrorReducer", () => {
  it("opens an activity with an empty explanation and no outcome", () => {
    const state = openState();
    expect(state).not.toBeNull();
    expect(state?.messageId).toBe("m1");
    expect(state?.conceptTitle).toBe("Hallucinations");
    expect(state?.learnerExplanation).toBe("");
    expect(state?.pending).toBe(false);
    expect(state?.feedback).toBeNull();
    expect(state?.error).toBeNull();
  });

  it("close resets the activity", () => {
    expect(mirrorReducer(openState(), { type: "close" })).toBeNull();
  });

  it("ignores actions when no activity is open", () => {
    expect(mirrorReducer(null, { type: "draft", learnerExplanation: "x" })).toBeNull();
    expect(mirrorReducer(null, { type: "submit" })).toBeNull();
  });

  it("records the learner's draft", () => {
    const state = mirrorReducer(openState(), {
      type: "draft",
      learnerExplanation: "My explanation.",
    });
    expect(state?.learnerExplanation).toBe("My explanation.");
  });

  it("a failure preserves the learner's explanation and shows a retryable error", () => {
    let state = mirrorReducer(openState(), {
      type: "draft",
      learnerExplanation: "My explanation.",
    });
    state = mirrorReducer(state, { type: "submit" });
    state = mirrorReducer(state, { type: "failure", error: ERROR });

    expect(state?.pending).toBe(false);
    expect(state?.error).toEqual(ERROR);
    expect(state?.feedback).toBeNull();
    expect(state?.learnerExplanation).toBe("My explanation.");
  });

  it("retrying after a failure preserves the explanation and clears the error", () => {
    let state = mirrorReducer(openState(), {
      type: "draft",
      learnerExplanation: "My explanation.",
    });
    state = mirrorReducer(state, { type: "submit" });
    state = mirrorReducer(state, { type: "failure", error: ERROR });
    // Retry re-submits the same attempt.
    state = mirrorReducer(state, { type: "submit" });

    expect(state?.pending).toBe(true);
    expect(state?.error).toBeNull();
    expect(state?.learnerExplanation).toBe("My explanation.");
  });

  it("cancelling leaves no error and keeps the explanation", () => {
    let state = mirrorReducer(openState(), {
      type: "draft",
      learnerExplanation: "My explanation.",
    });
    state = mirrorReducer(state, { type: "submit" });
    state = mirrorReducer(state, { type: "cancel" });

    expect(state?.pending).toBe(false);
    expect(state?.error).toBeNull();
    expect(state?.feedback).toBeNull();
    expect(state?.learnerExplanation).toBe("My explanation.");
  });

  it("editing after feedback returns to the composer with the explanation intact", () => {
    let state = mirrorReducer(openState(), {
      type: "draft",
      learnerExplanation: "My explanation.",
    });
    state = mirrorReducer(state, { type: "submit" });
    state = mirrorReducer(state, { type: "success", feedback: FEEDBACK });
    state = mirrorReducer(state, { type: "edit" });

    expect(state?.feedback).toBeNull();
    expect(state?.error).toBeNull();
    expect(state?.learnerExplanation).toBe("My explanation.");
  });
});

describe("deriveLoopStage", () => {
  it("starting the activity sets Think", () => {
    expect(deriveLoopStage(openState())).toBe("think");
  });

  it("a learner drafting sets Explain", () => {
    const state = mirrorReducer(openState(), {
      type: "draft",
      learnerExplanation: "My explanation.",
    });
    expect(deriveLoopStage(state)).toBe("explain");
  });

  it("focusing the composer sets Explain even before typing", () => {
    expect(deriveLoopStage(openState(), { composerFocused: true })).toBe("explain");
  });

  it("a pending evaluation sets Correct", () => {
    const state = mirrorReducer(openState(), { type: "submit" });
    expect(deriveLoopStage(state)).toBe("correct");
  });

  it("an evaluation error stays at Correct", () => {
    const state = mirrorReducer(openState(), { type: "failure", error: ERROR });
    expect(deriveLoopStage(state)).toBe("correct");
  });

  it("feedback with a recall prompt sets Remember", () => {
    const state = mirrorReducer(openState(), { type: "success", feedback: FEEDBACK });
    expect(deriveLoopStage(state)).toBe("remember");
  });

  it("feedback without a recall prompt honestly stays at Correct", () => {
    const state = mirrorReducer(openState(), {
      type: "success",
      feedback: { ...FEEDBACK, memoryEchoPrompt: undefined },
    });
    expect(deriveLoopStage(state)).toBe("correct");
  });

  it("a closed activity reports the default Think stage", () => {
    expect(deriveLoopStage(null)).toBe("think");
  });
});

describe("isDrafting", () => {
  it("is false with no activity and true while writing", () => {
    expect(isDrafting(null)).toBe(false);
    expect(isDrafting(openState())).toBe(false);
    expect(isDrafting(openState(), { composerFocused: true })).toBe(true);
    expect(
      isDrafting(
        mirrorReducer(openState(), { type: "draft", learnerExplanation: "x" }),
      ),
    ).toBe(true);
  });

  it("is false once a request is pending or feedback has arrived", () => {
    const drafted = mirrorReducer(openState(), {
      type: "draft",
      learnerExplanation: "x",
    });
    expect(isDrafting(mirrorReducer(drafted, { type: "submit" }))).toBe(false);
    expect(
      isDrafting(mirrorReducer(drafted, { type: "success", feedback: FEEDBACK })),
    ).toBe(false);
  });
});
