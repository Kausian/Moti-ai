import { describe, expect, it } from "vitest";
import type { ConversationSignals } from "./state-mapping";
import {
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
