import { describe, expect, it } from "vitest";
import type {
  ChatAvatarSignals,
  ConversationSignals,
  TeachBackAvatarSignals,
} from "./state-mapping";
import {
  combineAvatarSignals,
  mapConversationToVisualState,
  VISUAL_STATES,
  VISUAL_STATE_TEXT,
} from "./state-mapping";

const NEUTRAL: ConversationSignals = {
  requestPending: false,
  hasError: false,
  answerJustCompleted: false,
  composing: false,
};

describe("mapConversationToVisualState", () => {
  it("maps a pending request to thinking", () => {
    expect(mapConversationToVisualState({ ...NEUTRAL, requestPending: true })).toBe(
      "thinking",
    );
  });

  it("maps a conversation error to error", () => {
    expect(mapConversationToVisualState({ ...NEUTRAL, hasError: true })).toBe("error");
  });

  it("maps a newly completed answer to explaining", () => {
    expect(
      mapConversationToVisualState({ ...NEUTRAL, answerJustCompleted: true }),
    ).toBe("explaining");
  });

  it("maps active composing to listening", () => {
    expect(mapConversationToVisualState({ ...NEUTRAL, composing: true })).toBe(
      "listening",
    );
  });

  it("maps the neutral/idle case to idle", () => {
    expect(mapConversationToVisualState(NEUTRAL)).toBe("idle");
  });

  it("gives a pending request priority over an error", () => {
    expect(
      mapConversationToVisualState({
        ...NEUTRAL,
        requestPending: true,
        hasError: true,
      }),
    ).toBe("thinking");
  });

  it("gives an error priority over listening", () => {
    expect(
      mapConversationToVisualState({ ...NEUTRAL, hasError: true, composing: true }),
    ).toBe("error");
  });

  it("gives explaining priority over listening", () => {
    expect(
      mapConversationToVisualState({
        ...NEUTRAL,
        answerJustCompleted: true,
        composing: true,
      }),
    ).toBe("explaining");
  });

  it("returns idle after a cleared conversation (all signals off)", () => {
    expect(mapConversationToVisualState(NEUTRAL)).toBe("idle");
  });

  it("does not remain thinking after a cancellation (pending cleared, no error/answer)", () => {
    // A cancel leaves no error and produces no new answer; with the composer
    // still focused this is listening, otherwise idle — never thinking.
    expect(
      mapConversationToVisualState({ ...NEUTRAL, composing: true }),
    ).toBe("listening");
    expect(mapConversationToVisualState(NEUTRAL)).toBe("idle");
  });

  it("never emits celebrating from the conversation mapping (reserved)", () => {
    const states = [
      mapConversationToVisualState({ ...NEUTRAL, requestPending: true }),
      mapConversationToVisualState({ ...NEUTRAL, hasError: true }),
      mapConversationToVisualState({ ...NEUTRAL, answerJustCompleted: true }),
      mapConversationToVisualState({ ...NEUTRAL, composing: true }),
      mapConversationToVisualState(NEUTRAL),
    ];
    expect(states).not.toContain("celebrating");
  });
});

describe("combineAvatarSignals (chat + Moti Mirror teach-back)", () => {
  const IDLE_CHAT: ChatAvatarSignals = {
    requestPending: false,
    hasError: false,
    composing: false,
    answerCount: 1,
    hasMessages: true,
  };
  const CLOSED_MIRROR: TeachBackAvatarSignals = {
    active: false,
    pending: false,
    hasError: false,
    feedbackCount: 0,
    composing: false,
  };

  /** Resolves the combined signals the way the hook's mapping ultimately does. */
  function visualStateFor(
    chat: ChatAvatarSignals,
    mirror: TeachBackAvatarSignals,
    explainingWindowOpen = false,
  ) {
    const combined = combineAvatarSignals(chat, mirror);
    return mapConversationToVisualState({
      requestPending: combined.requestPending,
      hasError: combined.hasError,
      answerJustCompleted: explainingWindowOpen && combined.hasMessages,
      composing: combined.composing,
    });
  }

  it("maps a pending teach-back evaluation to thinking", () => {
    expect(
      visualStateFor(IDLE_CHAT, { ...CLOSED_MIRROR, active: true, pending: true }),
    ).toBe("thinking");
  });

  it("maps a teach-back error to error", () => {
    expect(
      visualStateFor(IDLE_CHAT, { ...CLOSED_MIRROR, active: true, hasError: true }),
    ).toBe("error");
  });

  it("maps completed teach-back feedback to explaining", () => {
    expect(
      visualStateFor(
        IDLE_CHAT,
        { ...CLOSED_MIRROR, active: true, feedbackCount: 1 },
        true,
      ),
    ).toBe("explaining");
  });

  it("maps a learner drafting an explanation to listening", () => {
    expect(
      visualStateFor(IDLE_CHAT, { ...CLOSED_MIRROR, active: true, composing: true }),
    ).toBe("listening");
  });

  it("gives a pending teach-back priority over normal idle and listening", () => {
    expect(
      visualStateFor(
        { ...IDLE_CHAT, composing: true },
        { ...CLOSED_MIRROR, active: true, pending: true, composing: true },
      ),
    ).toBe("thinking");
  });

  it("keeps normal chat requests working while an activity is open", () => {
    expect(
      visualStateFor({ ...IDLE_CHAT, requestPending: true }, { ...CLOSED_MIRROR, active: true }),
    ).toBe("thinking");
  });

  it("contributes nothing once the activity is closed", () => {
    const combined = combineAvatarSignals(IDLE_CHAT, {
      active: false,
      pending: true,
      hasError: true,
      feedbackCount: 3,
      composing: true,
    });
    expect(combined).toEqual({
      requestPending: false,
      hasError: false,
      composing: false,
      answerCount: 1,
      hasMessages: true,
    });
    expect(visualStateFor(IDLE_CHAT, { ...CLOSED_MIRROR, active: false })).toBe("idle");
  });

  it("sums answer counts so either a chat answer or feedback opens the explaining window", () => {
    const combined = combineAvatarSignals(IDLE_CHAT, {
      ...CLOSED_MIRROR,
      active: true,
      feedbackCount: 2,
    });
    expect(combined.answerCount).toBe(3);
  });

  it("treats an open activity as having messages", () => {
    const combined = combineAvatarSignals(
      { ...IDLE_CHAT, hasMessages: false, answerCount: 0 },
      { ...CLOSED_MIRROR, active: true },
    );
    expect(combined.hasMessages).toBe(true);
  });
});

describe("visual state metadata", () => {
  it("includes celebrating as a supported valid state", () => {
    expect(VISUAL_STATES).toContain("celebrating");
  });

  it("lists exactly the six visual states", () => {
    expect([...VISUAL_STATES].sort()).toEqual(
      ["celebrating", "error", "explaining", "idle", "listening", "thinking"].sort(),
    );
  });

  it("has non-empty accessible label, description, and announcement for every state", () => {
    for (const state of VISUAL_STATES) {
      const text = VISUAL_STATE_TEXT[state];
      expect(text.label.length).toBeGreaterThan(0);
      expect(text.description.length).toBeGreaterThan(0);
      expect(text.announcement.length).toBeGreaterThan(0);
    }
  });
});
