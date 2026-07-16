import { describe, expect, it } from "vitest";
import type { KnowledgeDocument, SupportedDocumentType } from "@/lib/types";
import { MAX_RESULTS } from "./constants";
import { buildIndex } from "./build-index";
import { retrieveKnowledge } from "./retrieve-knowledge";

function makeDocument(
  id: string,
  title: string,
  content: string,
): KnowledgeDocument {
  return {
    id,
    title,
    source: "pasted",
    documentType: "markdown" as SupportedDocumentType,
    characterCount: content.length,
    content,
    addedAt: "2025-01-01T00:00:00.000Z",
  };
}

function indexOf(documents: KnowledgeDocument[]) {
  return buildIndex(documents);
}

describe("retrieveKnowledge", () => {
  it("ranks a relevant chunk above an unrelated one", () => {
    const index = indexOf([
      makeDocument("h", "Notes", "An AI hallucination is confident but false output."),
      makeDocument("c", "Recipes", "Slice the onions and simmer the tomato sauce."),
    ]);
    const response = retrieveKnowledge(index, "What is a hallucination?");
    expect(response.results[0].chunk.documentId).toBe("h");
  });

  it("applies a document-title boost", () => {
    const body = "This section explains the topic in general terms.";
    const index = indexOf([
      makeDocument("a", "Injection Guide", body),
      makeDocument("b", "General Notes", body),
    ]);
    const response = retrieveKnowledge(index, "injection");
    expect(response.results).toHaveLength(1);
    expect(response.results[0].chunk.documentId).toBe("a");
    expect(response.results[0].scoreBreakdown.titleBoost).toBeGreaterThan(0);
  });

  it("applies a section-heading boost", () => {
    const index = indexOf([
      makeDocument(
        "d",
        "Doc",
        "## Injection\nGeneral discussion here.\n\n## Other\nGeneral discussion here.",
      ),
    ]);
    const response = retrieveKnowledge(index, "injection");
    expect(response.results).toHaveLength(1);
    expect(response.results[0].chunk.sectionHeading).toBe("Injection");
    expect(response.results[0].scoreBreakdown.headingBoost).toBeGreaterThan(0);
  });

  it("applies an exact-phrase boost", () => {
    const index = indexOf([
      makeDocument("a", "A", "Prompt injection is a real risk to consider."),
      makeDocument("b", "B", "The prompt is short and injection is separate here."),
    ]);
    const response = retrieveKnowledge(index, "prompt injection");
    expect(response.results[0].chunk.documentId).toBe("a");
    expect(response.results[0].scoreBreakdown.phraseBoost).toBeGreaterThan(0);
    const other = response.results.find((r) => r.chunk.documentId === "b");
    expect(other?.scoreBreakdown.phraseBoost).toBe(0);
  });

  it("does not let a generic term outrank a specific relevant match", () => {
    const index = indexOf([
      makeDocument("s", "Specific", "An AI hallucination is false, unsupported output."),
      makeDocument("g", "Generic", "AI AI AI AI systems and AI tooling and AI models."),
    ]);
    const response = retrieveKnowledge(index, "AI hallucination");
    expect(response.results[0].chunk.documentId).toBe("s");
  });

  it("returns nothing for a stop-word-only query", () => {
    const index = indexOf([makeDocument("a", "A", "Prompt injection matters.")]);
    const response = retrieveKnowledge(index, "what is the");
    expect(response.meaningfulQueryTerms).toEqual([]);
    expect(response.results).toEqual([]);
    expect(response.hasRelevantKnowledge).toBe(false);
  });

  it("returns nothing for an unrelated query", () => {
    const index = indexOf([
      makeDocument("a", "A", "An AI hallucination is confident but false output."),
    ]);
    const response = retrieveKnowledge(index, "company parking policy");
    expect(response.results).toEqual([]);
    expect(response.hasRelevantKnowledge).toBe(false);
  });

  it("respects the top-result limit", () => {
    const sections = Array.from(
      { length: 6 },
      (_, i) => `## Section ${i}\nThis section is about the topic keyword.`,
    ).join("\n\n");
    const index = indexOf([makeDocument("multi", "Multi", sections)]);
    const response = retrieveKnowledge(index, "topic");
    expect(index.chunks.length).toBeGreaterThan(MAX_RESULTS);
    expect(response.results.length).toBe(MAX_RESULTS);
  });

  it("breaks ties deterministically by title then chunk index", () => {
    const body = "The topic keyword appears here once.";
    const index = indexOf([
      makeDocument("z", "Zebra", body),
      makeDocument("a", "Alpha", body),
    ]);
    const first = retrieveKnowledge(index, "topic");
    const second = retrieveKnowledge(index, "topic");
    expect(first.results.map((r) => r.chunk.documentId)).toEqual(
      second.results.map((r) => r.chunk.documentId),
    );
    // Equal scores → Alpha sorts before Zebra.
    expect(first.results[0].chunk.documentTitle).toBe("Alpha");
  });

  it("produces finite score values and a breakdown that sums to the total", () => {
    const index = indexOf([
      makeDocument("a", "A", "Prompt injection and prompt structure basics."),
    ]);
    const response = retrieveKnowledge(index, "prompt injection");
    for (const result of response.results) {
      const b = result.scoreBreakdown;
      expect(Number.isFinite(result.score)).toBe(true);
      for (const value of Object.values(b)) {
        expect(Number.isFinite(value)).toBe(true);
      }
      const sum =
        b.contentScore + b.titleBoost + b.headingBoost + b.phraseBoost + b.coverageBoost;
      expect(b.total).toBeCloseTo(sum, 6);
    }
  });

  it("preserves source metadata on results", () => {
    const index = indexOf([
      makeDocument("doc-x", "Source X", "## Heading One\nPrompt injection details here."),
    ]);
    const response = retrieveKnowledge(index, "injection");
    const chunk = response.results[0].chunk;
    expect(chunk.documentId).toBe("doc-x");
    expect(chunk.documentTitle).toBe("Source X");
    expect(chunk.documentType).toBe("markdown");
    expect(chunk.sectionHeading).toBe("Heading One");
    expect(chunk.id).toBe("doc-x:chunk:0");
  });
});
