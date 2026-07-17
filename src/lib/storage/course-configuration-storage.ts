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

/**
 * v2 adds the stable `courseId` that Phase 9 scopes learning progress by. v1 data
 * is migrated on read (see `migrateLegacyConfiguration`) rather than discarded —
 * a learner's saved documents and settings must survive the upgrade.
 */
export const COURSE_CONFIGURATION_STORAGE_KEY =
  "moti-ai:course-configuration:v2";

/** Read-only: the pre-courseId key, still read once so v1 data can migrate. */
export const LEGACY_COURSE_CONFIGURATION_STORAGE_KEY =
  "moti-ai:course-configuration:v1";

export type SaveResult = { ok: true } | { ok: false; message: string };

/** Injectable so migration tests are deterministic and need no crypto stub. */
export type IdFactory = () => string;

function defaultIdFactory(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `course_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

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

/** The shared shape of v1 and v2, minus identity. */
function hasValidCourseFields(config: Record<string, unknown>): boolean {
  return (
    isString(config.courseTitle) &&
    isLearnerLevel(config.learnerLevel) &&
    isString(config.learningObjective) &&
    isString(config.assistantInstructions) &&
    Array.isArray(config.documents) &&
    config.documents.every(isKnowledgeDocument)
  );
}

export function isCourseConfiguration(
  value: unknown,
): value is CourseConfiguration {
  if (typeof value !== "object" || value === null) return false;
  const config = value as Record<string, unknown>;
  return (
    isString(config.courseId) &&
    config.courseId.trim().length > 0 &&
    hasValidCourseFields(config)
  );
}

/**
 * Upgrades a v1 configuration (no `courseId`) to v2 by assigning a fresh stable
 * id. Every other field — including all documents — is preserved untouched.
 *
 * A migrated course gets a random id rather than the sample id: stored data may
 * have been edited, and we cannot reliably tell an untouched sample from a
 * customised one. A random id is always stable and never collides with another
 * course's progress.
 */
export function migrateLegacyConfiguration(
  value: unknown,
  newId: IdFactory = defaultIdFactory,
): CourseConfiguration | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }
  const config = value as Record<string, unknown>;
  if (!hasValidCourseFields(config)) return null;

  // Already identified (a v2 object read from the legacy key) — keep its id.
  if (isString(config.courseId) && config.courseId.trim().length > 0) {
    return config as unknown as CourseConfiguration;
  }
  return { ...(config as unknown as CourseConfiguration), courseId: newId() };
}

function readKey(key: string): unknown {
  let raw: string | null;
  try {
    raw = window.localStorage.getItem(key);
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function loadConfiguration(
  newId: IdFactory = defaultIdFactory,
): CourseConfiguration | null {
  if (typeof window === "undefined") return null;

  const current = readKey(COURSE_CONFIGURATION_STORAGE_KEY);
  if (current !== null) {
    return isCourseConfiguration(current) ? current : null;
  }

  // No v2 record: migrate a v1 one if present, then persist the upgrade so the
  // id stays stable across reloads.
  const legacy = readKey(LEGACY_COURSE_CONFIGURATION_STORAGE_KEY);
  if (legacy === null) return null;

  const migrated = migrateLegacyConfiguration(legacy, newId);
  if (!migrated) return null;

  saveConfiguration(migrated);
  return migrated;
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
