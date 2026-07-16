import { describe, expect, it } from "vitest";
import {
  extractTokens,
  meaningfulQueryTerms,
  tokenizeContent,
} from "./tokenize";

describe("tokenize", () => {
  it("strips punctuation with no search meaning", () => {
    expect(extractTokens("Hello, world! (really?)")).toEqual([
      "hello",
      "world",
      "really",
    ]);
  });

  it("normalizes case consistently", () => {
    expect(extractTokens("PROMPT Prompt prompt")).toEqual([
      "prompt",
      "prompt",
      "prompt",
    ]);
  });

  it("strips diacritics", () => {
    expect(extractTokens("café naïve")).toEqual(["cafe", "naive"]);
  });

  it("removes stop words from content tokens", () => {
    expect(tokenizeContent("the cat is on the mat")).toEqual(["cat", "mat"]);
  });

  it("de-duplicates repeated meaningful query terms", () => {
    expect(meaningfulQueryTerms("prompt prompt injection prompt")).toEqual([
      "prompt",
      "injection",
    ]);
  });

  it("returns no terms for empty or whitespace-only queries", () => {
    expect(meaningfulQueryTerms("")).toEqual([]);
    expect(meaningfulQueryTerms("   \n\t ")).toEqual([]);
  });

  it("returns no terms for a stop-word-only query", () => {
    expect(meaningfulQueryTerms("what is the")).toEqual([]);
  });

  it("keeps useful numbers and technical terms searchable", () => {
    const tokens = extractTokens("GPT-4 covers section 3 of the guide");
    expect(tokens).toContain("gpt");
    expect(tokens).toContain("4");
    expect(tokens).toContain("section");
    expect(tokens).toContain("3");
  });
});
