import { describe, expect, it } from "vitest";
import type {
  ChatSourceInput,
  ConversationMessage,
  ConversationMessageStatus,
  ConversationRole,
  KnowledgeRetrievalResult,
} from "@/lib/types";
import {
  buildRequestHistory,
  selectUsedSources,
  toChatSources,
} from "./conversation-history";

function message(
  role: ConversationRole,
  content: string,
  status: ConversationMessageStatus = "complete",
): ConversationMessage {
  return {
    id: `${role}-${content}`,
    role,
    content,
    createdAt: "2025-01-01T00:00:00.000Z",
    status,
  };
}

describe("buildRequestHistory", () => {
  it("limits history to the six most recent complete messages", () => {
    const messages = Array.from({ length: 8 }, (_, i) =>
      message(i % 2 === 0 ? "user" : "assistant", `m${i}`),
    );
    const history = buildRequestHistory(messages);
    expect(history).toHaveLength(6);
    expect(history[0].content).toBe("m2");
    expect(history[5].content).toBe("m7");
  });

  it("excludes pending and failed messages", () => {
    const messages: ConversationMessage[] = [
      message("user", "q1"),
      message("assistant", "a1"),
      message("user", "q2"),
      message("assistant", "", "sending"),
    ];
    const history = buildRequestHistory(messages);
    expect(history.map((h) => h.content)).toEqual(["q1", "a1", "q2"]);
  });

  it("returns an empty history for an empty conversation", () => {
    expect(buildRequestHistory([])).toEqual([]);
  });
});

describe("selectUsedSources", () => {
  const sent: ChatSourceInput[] = [
    { chunkId: "a", documentId: "d", documentTitle: "Doc A", chunkIndex: 0, content: "A body" },
    { chunkId: "b", documentId: "d", documentTitle: "Doc B", chunkIndex: 1, content: "B body" },
  ];

  it("maps only validated ids and removes duplicates and unknowns", () => {
    const result = selectUsedSources(sent, ["a", "x", "a", "b"]);
    expect(result.map((source) => source.id)).toEqual(["a", "b"]);
  });

  it("returns nothing when no ids match", () => {
    expect(selectUsedSources(sent, ["unknown"])).toEqual([]);
  });
});

describe("toChatSources", () => {
  function result(id: string, content: string): KnowledgeRetrievalResult {
    return {
      chunk: {
        id,
        documentId: "doc",
        documentTitle: "Doc",
        documentType: "markdown",
        chunkIndex: 0,
        sectionHeading: "Heading",
        content,
        characterStart: 0,
        characterEnd: content.length,
        characterCount: content.length,
      },
      score: 1,
      matchedTerms: ["term"],
      scoreBreakdown: {
        contentScore: 1,
        titleBoost: 0,
        headingBoost: 0,
        phraseBoost: 0,
        coverageBoost: 0,
        total: 1,
      },
      excerpt: content,
    };
  }

  it("maps chunk metadata and truncates content to the per-source limit", () => {
    const sources = toChatSources([result("doc:chunk:0", "y".repeat(2000))]);
    expect(sources).toHaveLength(1);
    expect(sources[0].chunkId).toBe("doc:chunk:0");
    expect(sources[0].sectionHeading).toBe("Heading");
    expect(sources[0].content.length).toBe(1500);
  });
});
