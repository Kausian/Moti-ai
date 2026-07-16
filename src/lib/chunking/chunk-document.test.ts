import { describe, expect, it } from "vitest";
import type { KnowledgeDocument, SupportedDocumentType } from "@/lib/types";
import { MAX_CHUNK_SIZE } from "./constants";
import { chunkDocument } from "./chunk-document";
import { buildChunks } from "./build-chunks";

function makeDocument(
  content: string,
  overrides: Partial<KnowledgeDocument> = {},
): KnowledgeDocument {
  return {
    id: "doc-1",
    title: "Doc",
    source: "pasted",
    documentType: "markdown" as SupportedDocumentType,
    characterCount: content.length,
    content,
    addedAt: "2025-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const longParagraph = Array.from({ length: 700 }, () => "word").join(" ");

describe("chunkDocument", () => {
  it("keeps a short document as a single chunk", () => {
    const chunks = chunkDocument(makeDocument("Just a short line of text."));
    expect(chunks).toHaveLength(1);
    expect(chunks[0].id).toBe("doc-1:chunk:0");
    expect(chunks[0].chunkIndex).toBe(0);
    expect(chunks[0].content).toContain("short line of text");
  });

  it("produces no chunks for empty or whitespace-only content", () => {
    expect(chunkDocument(makeDocument(""))).toHaveLength(0);
    expect(chunkDocument(makeDocument("   \n\n  \t "))).toHaveLength(0);
  });

  it("preserves Markdown heading metadata", () => {
    const chunks = chunkDocument(
      makeDocument("## Topic A\nBody about A.\n\n## Topic B\nBody about B."),
    );
    expect(chunks.map((chunk) => chunk.sectionHeading)).toEqual([
      "Topic A",
      "Topic B",
    ]);
  });

  it("splits an oversized paragraph into multiple chunks", () => {
    const chunks = chunkDocument(makeDocument(longParagraph));
    expect(chunks.length).toBeGreaterThan(1);
  });

  it("never exceeds the hard maximum chunk size", () => {
    const chunks = chunkDocument(makeDocument(longParagraph));
    for (const chunk of chunks) {
      expect(chunk.characterCount).toBeLessThanOrEqual(MAX_CHUNK_SIZE);
    }
  });

  it("carries overlap between consecutive chunks of one section", () => {
    const chunks = chunkDocument(makeDocument(longParagraph));
    expect(chunks.length).toBeGreaterThan(1);
    // The second chunk begins before the first one ends → overlapping offsets.
    expect(chunks[1].characterStart).toBeLessThan(chunks[0].characterEnd);
  });

  it("produces deterministic, stable ids", () => {
    const document = makeDocument(longParagraph);
    const first = chunkDocument(document);
    const second = chunkDocument(document);
    expect(second).toEqual(first);
    expect(first.map((chunk) => chunk.id)).toEqual(
      first.map((_, index) => `doc-1:chunk:${index}`),
    );
  });

  it("isolates chunks across multiple documents", () => {
    const chunks = buildChunks([
      makeDocument("Alpha body.", { id: "alpha", title: "Alpha" }),
      makeDocument("Beta body.", { id: "beta", title: "Beta" }),
    ]);
    expect(chunks).toHaveLength(2);
    expect(chunks[0].id).toBe("alpha:chunk:0");
    expect(chunks[0].documentId).toBe("alpha");
    expect(chunks[1].id).toBe("beta:chunk:0");
    expect(chunks[1].documentId).toBe("beta");
  });
});
