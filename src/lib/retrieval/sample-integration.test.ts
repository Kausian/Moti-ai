import { describe, expect, it } from "vitest";
import { createDefaultConfiguration } from "@/data/sample-course";
import { buildIndex } from "./build-index";
import { retrieveKnowledge } from "./retrieve-knowledge";

const index = buildIndex(createDefaultConfiguration().documents);

describe("sample course retrieval", () => {
  it("retrieves the hallucination section first", () => {
    const response = retrieveKnowledge(index, "What is an AI hallucination?");
    expect(response.results[0].chunk.sectionHeading).toBe("AI hallucinations");
  });

  it("retrieves the prompt-structure section first", () => {
    const response = retrieveKnowledge(index, "How can I make a prompt clearer?");
    expect(response.results[0].chunk.sectionHeading).toBe("Prompt structure");
  });

  it("retrieves the prompt-injection section first", () => {
    const response = retrieveKnowledge(index, "What is prompt injection?");
    expect(response.results[0].chunk.sectionHeading).toBe("Prompt injection");
  });

  it("returns no relevant result for an off-topic question", () => {
    const response = retrieveKnowledge(index, "What is the company parking policy?");
    expect(response.hasRelevantKnowledge).toBe(false);
    expect(response.results).toEqual([]);
  });
});
