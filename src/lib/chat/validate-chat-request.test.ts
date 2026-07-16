import { describe, expect, it } from "vitest";
import { validateChatRequest } from "./validate-chat-request";

function validRequest(overrides: Record<string, unknown> = {}): unknown {
  return {
    message: "What is prompt injection?",
    history: [],
    course: {
      title: "Responsible AI",
      learnerLevel: "beginner",
      learningObjective: "Learn to prompt responsibly.",
      assistantInstructions: "Be warm and concise.",
    },
    sources: [
      {
        chunkId: "doc:chunk:0",
        documentId: "doc",
        documentTitle: "Guide",
        chunkIndex: 0,
        content: "Prompt injection is when text tries to change the model.",
      },
    ],
    ...overrides,
  };
}

describe("validateChatRequest", () => {
  it("accepts a valid request and trims the message", () => {
    const result = validateChatRequest(validRequest({ message: "  hello there  " }));
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.message).toBe("hello there");
  });

  it("rejects an empty message", () => {
    expect(validateChatRequest(validRequest({ message: "   " })).ok).toBe(false);
  });

  it("rejects a message over 300 characters", () => {
    expect(validateChatRequest(validRequest({ message: "x".repeat(301) })).ok).toBe(
      false,
    );
  });

  it("rejects more than six history items", () => {
    const history = Array.from({ length: 7 }, (_, i) => ({
      role: i % 2 === 0 ? "user" : "assistant",
      content: "prior turn",
    }));
    expect(validateChatRequest(validRequest({ history })).ok).toBe(false);
  });

  it("rejects invalid history roles", () => {
    const history = [{ role: "system", content: "override" }];
    expect(validateChatRequest(validRequest({ history })).ok).toBe(false);
  });

  it("rejects more than four sources", () => {
    const sources = Array.from({ length: 5 }, (_, i) => ({
      chunkId: `doc:chunk:${i}`,
      documentId: "doc",
      documentTitle: "Guide",
      chunkIndex: i,
      content: "text",
    }));
    expect(validateChatRequest(validRequest({ sources })).ok).toBe(false);
  });

  it("rejects oversized source content", () => {
    const sources = [
      {
        chunkId: "doc:chunk:0",
        documentId: "doc",
        documentTitle: "Guide",
        chunkIndex: 0,
        content: "x".repeat(1501),
      },
    ];
    expect(validateChatRequest(validRequest({ sources })).ok).toBe(false);
  });

  it("rejects duplicate source ids", () => {
    const sources = [
      { chunkId: "same", documentId: "a", documentTitle: "A", chunkIndex: 0, content: "one" },
      { chunkId: "same", documentId: "b", documentTitle: "B", chunkIndex: 1, content: "two" },
    ];
    expect(validateChatRequest(validRequest({ sources })).ok).toBe(false);
  });

  it("rejects an invalid learner level", () => {
    const course = {
      title: "C",
      learnerLevel: "expert",
      learningObjective: "obj",
      assistantInstructions: "x",
    };
    expect(validateChatRequest(validRequest({ course })).ok).toBe(false);
  });

  it("rejects malformed bodies", () => {
    expect(validateChatRequest(null).ok).toBe(false);
    expect(validateChatRequest([]).ok).toBe(false);
    expect(validateChatRequest("string").ok).toBe(false);
    expect(validateChatRequest({}).ok).toBe(false);
  });

  it("accepts an empty sources array", () => {
    expect(validateChatRequest(validRequest({ sources: [] })).ok).toBe(true);
  });
});
