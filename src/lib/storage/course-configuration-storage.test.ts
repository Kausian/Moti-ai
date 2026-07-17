import { describe, expect, it } from "vitest";
import type { CourseConfiguration } from "@/lib/types";
import {
  isCourseConfiguration,
  migrateLegacyConfiguration,
} from "./course-configuration-storage";
import { SAMPLE_COURSE_ID, createDefaultConfiguration } from "@/data/sample-course";

/** A v1 record: everything the learner had, but no courseId. */
function legacyConfiguration(overrides: Record<string, unknown> = {}) {
  return {
    courseTitle: "My Custom Course",
    learnerLevel: "advanced",
    learningObjective: "Master prompt injection defence.",
    assistantInstructions: "Be terse.",
    documents: [
      {
        id: "doc-1",
        title: "My Notes",
        source: "upload",
        documentType: "pdf",
        characterCount: 12,
        content: "Some content",
        addedAt: "2025-01-01T00:00:00.000Z",
        originalFileName: "notes.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1234,
      },
    ],
    ...overrides,
  };
}

describe("course identity", () => {
  it("gives the sample course a deterministic id", () => {
    expect(createDefaultConfiguration().courseId).toBe(SAMPLE_COURSE_ID);
    // Deterministic across calls, so SSR and the client agree.
    expect(createDefaultConfiguration().courseId).toBe(
      createDefaultConfiguration().courseId,
    );
  });

  it("resetting to the sample restores the deterministic sample id", () => {
    const fresh = createDefaultConfiguration();
    expect(fresh.courseId).toBe(SAMPLE_COURSE_ID);
    expect(isCourseConfiguration(fresh)).toBe(true);
  });

  it("requires a non-empty courseId to be a valid v2 configuration", () => {
    expect(isCourseConfiguration(legacyConfiguration())).toBe(false);
    expect(isCourseConfiguration({ ...legacyConfiguration(), courseId: "  " })).toBe(
      false,
    );
    expect(isCourseConfiguration({ ...legacyConfiguration(), courseId: "c1" })).toBe(
      true,
    );
  });
});

describe("migrateLegacyConfiguration", () => {
  it("adds a stable id to a v1 configuration", () => {
    const migrated = migrateLegacyConfiguration(legacyConfiguration(), () => "new-id");
    expect(migrated).not.toBeNull();
    expect(migrated?.courseId).toBe("new-id");
    expect(isCourseConfiguration(migrated)).toBe(true);
  });

  it("preserves every existing field and document through migration", () => {
    const legacy = legacyConfiguration();
    const migrated = migrateLegacyConfiguration(legacy, () => "new-id");

    expect(migrated?.courseTitle).toBe("My Custom Course");
    expect(migrated?.learnerLevel).toBe("advanced");
    expect(migrated?.learningObjective).toBe("Master prompt injection defence.");
    expect(migrated?.assistantInstructions).toBe("Be terse.");
    // The learner's documents must survive the upgrade untouched.
    expect(migrated?.documents).toEqual(legacy.documents);
  });

  it("keeps an id that is already present", () => {
    const migrated = migrateLegacyConfiguration(
      { ...legacyConfiguration(), courseId: "existing-id" },
      () => "should-not-be-used",
    );
    expect(migrated?.courseId).toBe("existing-id");
  });

  it("rejects malformed legacy data rather than inventing a course", () => {
    expect(migrateLegacyConfiguration(null, () => "id")).toBeNull();
    expect(migrateLegacyConfiguration([], () => "id")).toBeNull();
    expect(migrateLegacyConfiguration("nope", () => "id")).toBeNull();
    expect(migrateLegacyConfiguration({}, () => "id")).toBeNull();
    expect(
      migrateLegacyConfiguration(legacyConfiguration({ documents: "no" }), () => "id"),
    ).toBeNull();
    expect(
      migrateLegacyConfiguration(
        legacyConfiguration({ learnerLevel: "expert" }),
        () => "id",
      ),
    ).toBeNull();
  });

  it("keeps the id stable when the editable course title changes", () => {
    const migrated = migrateLegacyConfiguration(legacyConfiguration(), () => "new-id");
    if (!migrated) throw new Error("migration failed");

    const renamed: CourseConfiguration = {
      ...migrated,
      courseTitle: "A Totally Different Name",
    };
    // Identity is not the title: renaming must never orphan saved progress.
    expect(renamed.courseId).toBe(migrated.courseId);
  });
});
