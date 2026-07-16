// The single place course configuration is read from / written to browser
// localStorage. Uses a versioned key, validates parsed data before trusting it,
// and recovers safely from malformed or outdated saved data. Only extracted
// text and safe metadata are ever stored — never File objects.

import type {
  CourseConfiguration,
  KnowledgeDocument,
  KnowledgeDocumentSource,
  LearnerLevel,
  SupportedDocumentType,
} from "@/lib/types";

export const COURSE_CONFIGURATION_STORAGE_KEY =
  "moti-ai:course-configuration:v1";

export type SaveResult = { ok: true } | { ok: false; message: string };

function isString(value: unknown): value is string {
  return typeof value === "string";
}

function isLearnerLevel(value: unknown): value is LearnerLevel {
  return value === "beginner" || value === "intermediate" || value === "advanced";
}

function isSource(value: unknown): value is KnowledgeDocumentSource {
  return value === "sample" || value === "upload" || value === "pasted";
}

function isDocumentType(value: unknown): value is SupportedDocumentType {
  return (
    value === "pdf" ||
    value === "txt" ||
    value === "markdown" ||
    value === "plain-text"
  );
}

function isKnowledgeDocument(value: unknown): value is KnowledgeDocument {
  if (typeof value !== "object" || value === null) return false;
  const doc = value as Record<string, unknown>;
  return (
    isString(doc.id) &&
    isString(doc.title) &&
    isSource(doc.source) &&
    isDocumentType(doc.documentType) &&
    typeof doc.characterCount === "number" &&
    isString(doc.content) &&
    isString(doc.addedAt) &&
    (doc.originalFileName === undefined || isString(doc.originalFileName)) &&
    (doc.mimeType === undefined || isString(doc.mimeType)) &&
    (doc.sizeBytes === undefined || typeof doc.sizeBytes === "number")
  );
}

export function isCourseConfiguration(
  value: unknown,
): value is CourseConfiguration {
  if (typeof value !== "object" || value === null) return false;
  const config = value as Record<string, unknown>;
  return (
    isString(config.courseTitle) &&
    isLearnerLevel(config.learnerLevel) &&
    isString(config.learningObjective) &&
    isString(config.assistantInstructions) &&
    Array.isArray(config.documents) &&
    config.documents.every(isKnowledgeDocument)
  );
}

export function loadConfiguration(): CourseConfiguration | null {
  if (typeof window === "undefined") return null;

  let raw: string | null;
  try {
    raw = window.localStorage.getItem(COURSE_CONFIGURATION_STORAGE_KEY);
  } catch {
    return null;
  }
  if (!raw) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  return isCourseConfiguration(parsed) ? parsed : null;
}

export function saveConfiguration(config: CourseConfiguration): SaveResult {
  if (typeof window === "undefined") {
    return { ok: false, message: "Storage is unavailable in this environment." };
  }
  try {
    window.localStorage.setItem(
      COURSE_CONFIGURATION_STORAGE_KEY,
      JSON.stringify(config),
    );
    return { ok: true };
  } catch {
    return {
      ok: false,
      message:
        "Couldn't save to this browser. Storage may be full or blocked (for example, in private browsing).",
    };
  }
}
