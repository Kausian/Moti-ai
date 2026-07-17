import { describe, expect, it } from "vitest";
import { buildConceptId, normalizeConceptTitle } from "./concept-id";

describe("normalizeConceptTitle", () => {
  it("lowercases and hyphenates consistently", () => {
    expect(normalizeConceptTitle("AI Hallucinations")).toBe("ai-hallucinations");
    expect(normalizeConceptTitle("  Prompt   Injection  ")).toBe("prompt-injection");
  });

  it("is stable across casing and spacing differences", () => {
    expect(normalizeConceptTitle("Prompt Structure")).toBe(
      normalizeConceptTitle("prompt   structure"),
    );
  });

  it("normalizes Unicode and strips accents", () => {
    expect(normalizeConceptTitle("Café")).toBe("cafe");
    // Composed vs decomposed forms must resolve identically.
    expect(normalizeConceptTitle("Café")).toBe(normalizeConceptTitle("Café"));
  });

  it("collapses unsupported separators and trims edges", () => {
    expect(normalizeConceptTitle("§ 3: Hallucinations!")).toBe("3-hallucinations");
    expect(normalizeConceptTitle("---edge---")).toBe("edge");
  });

  it("returns an empty string when nothing usable remains", () => {
    expect(normalizeConceptTitle("")).toBe("");
    expect(normalizeConceptTitle("   ")).toBe("");
    expect(normalizeConceptTitle("§§§")).toBe("");
  });
});

describe("buildConceptId", () => {
  const base = {
    courseId: "course-1",
    sourceDocumentId: "doc-1",
    conceptTitle: "Responsible AI Guide",
  };

  it("is deterministic", () => {
    const input = { ...base, sectionHeading: "AI Hallucinations" };
    expect(buildConceptId(input)).toBe(buildConceptId(input));
  });

  it("prefers the section heading", () => {
    expect(buildConceptId({ ...base, sectionHeading: "AI Hallucinations" })).toBe(
      "course-1:doc-1:ai-hallucinations",
    );
  });

  it("falls back to the concept title when there is no usable heading", () => {
    expect(buildConceptId(base)).toBe("course-1:doc-1:responsible-ai-guide");
    expect(buildConceptId({ ...base, sectionHeading: "   " })).toBe(
      "course-1:doc-1:responsible-ai-guide",
    );
    expect(buildConceptId({ ...base, sectionHeading: "§§" })).toBe(
      "course-1:doc-1:responsible-ai-guide",
    );
  });

  it("isolates different courses", () => {
    const a = buildConceptId({ ...base, sectionHeading: "Hallucinations" });
    const b = buildConceptId({
      ...base,
      courseId: "course-2",
      sectionHeading: "Hallucinations",
    });
    expect(a).not.toBe(b);
  });

  it("isolates different documents", () => {
    const a = buildConceptId({ ...base, sectionHeading: "Hallucinations" });
    const b = buildConceptId({
      ...base,
      sourceDocumentId: "doc-2",
      sectionHeading: "Hallucinations",
    });
    expect(a).not.toBe(b);
  });

  it("returns null rather than a broken id when nothing is identifiable", () => {
    expect(
      buildConceptId({ ...base, conceptTitle: "§§", sectionHeading: "  " }),
    ).toBeNull();
    expect(buildConceptId({ ...base, courseId: "  " })).toBeNull();
    expect(buildConceptId({ ...base, sourceDocumentId: "" })).toBeNull();
  });
});
