// Manual, dependency-free runtime validation of the untrusted /api/teach-back
// body. Returns a fully-typed request or a single safe error reason (no
// internals or stack traces are exposed to the client).
//
// Note the shape is deliberately closed: only the fields of MotiMirrorRequest
// are ever read, so a client cannot smuggle conversation history, documents, or
// extra instructions into the teach-back prompt.

import type {
  LearnerLevel,
  MotiMirrorRequest,
  TeachBackSourceInput,
} from "@/lib/types";
import {
  LEARNER_LEVELS,
  MAX_ASSISTANT_INSTRUCTIONS_LENGTH,
  MAX_COURSE_TITLE_LENGTH,
  MAX_OBJECTIVE_LENGTH,
  MAX_SOURCE_CONTENT_LENGTH,
  MAX_SOURCES,
  MAX_TOTAL_SOURCE_CONTEXT,
} from "@/lib/chat/constants";
import {
  MAX_CONCEPT_TITLE_LENGTH,
  MAX_EXPLANATION_LENGTH,
  MIN_EXPLANATION_LENGTH,
  MIN_TEACH_BACK_SOURCES,
} from "./constants";

export type ValidateTeachBackRequestResult =
  | { ok: true; value: MotiMirrorRequest }
  | { ok: false; reason: string };

function fail(reason: string): { ok: false; reason: string } {
  return { ok: false, reason };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isLearnerLevel(value: unknown): value is LearnerLevel {
  return (LEARNER_LEVELS as readonly string[]).includes(value as string);
}

function validateCourse(
  value: unknown,
): { ok: true; value: MotiMirrorRequest["course"] } | { ok: false; reason: string } {
  if (!isRecord(value)) return fail("Course configuration is required.");

  const { title, learnerLevel, learningObjective, assistantInstructions } = value;
  if (typeof title !== "string") return fail("Course title must be a string.");
  const trimmedTitle = title.trim();
  if (trimmedTitle.length === 0) return fail("Course title is required.");
  if (trimmedTitle.length > MAX_COURSE_TITLE_LENGTH) {
    return fail("Course title is too long.");
  }

  if (!isLearnerLevel(learnerLevel)) return fail("Unsupported learner level.");

  if (typeof learningObjective !== "string") {
    return fail("Learning objective must be a string.");
  }
  const objective = learningObjective.trim();
  if (objective.length > MAX_OBJECTIVE_LENGTH) {
    return fail("Learning objective is too long.");
  }

  if (typeof assistantInstructions !== "string") {
    return fail("Assistant instructions must be a string.");
  }
  const instructions = assistantInstructions.trim();
  if (instructions.length > MAX_ASSISTANT_INSTRUCTIONS_LENGTH) {
    return fail("Assistant instructions are too long.");
  }

  return {
    ok: true,
    value: {
      title: trimmedTitle,
      learnerLevel,
      learningObjective: objective,
      assistantInstructions: instructions,
    },
  };
}

function validateSources(
  value: unknown,
): { ok: true; value: TeachBackSourceInput[] } | { ok: false; reason: string } {
  if (!Array.isArray(value)) return fail("Sources must be an array.");
  if (value.length < MIN_TEACH_BACK_SOURCES) {
    return fail("Teach-back requires at least one source.");
  }
  if (value.length > MAX_SOURCES) return fail("Too many sources.");

  const sources: TeachBackSourceInput[] = [];
  const seenIds = new Set<string>();
  let totalContent = 0;

  for (const item of value) {
    if (!isRecord(item)) return fail("Malformed source.");
    const { chunkId, documentId, documentTitle, sectionHeading, chunkIndex, content } =
      item;

    if (typeof chunkId !== "string" || chunkId.trim().length === 0) {
      return fail("Source is missing a valid id.");
    }
    if (seenIds.has(chunkId)) return fail("Duplicate source id.");
    seenIds.add(chunkId);

    if (typeof documentId !== "string" || documentId.trim().length === 0) {
      return fail("Source is missing a document id.");
    }
    if (typeof documentTitle !== "string" || documentTitle.trim().length === 0) {
      return fail("Source is missing a document title.");
    }
    if (sectionHeading !== undefined && typeof sectionHeading !== "string") {
      return fail("Malformed source section heading.");
    }
    if (
      typeof chunkIndex !== "number" ||
      !Number.isInteger(chunkIndex) ||
      chunkIndex < 0
    ) {
      return fail("Malformed source chunk index.");
    }
    if (typeof content !== "string" || content.trim().length === 0) {
      return fail("Source content is required.");
    }
    if (content.length > MAX_SOURCE_CONTENT_LENGTH) {
      return fail("Source content is too long.");
    }

    totalContent += content.length;
    if (totalContent > MAX_TOTAL_SOURCE_CONTEXT) {
      return fail("Combined source context is too large.");
    }

    sources.push({
      chunkId,
      documentId,
      documentTitle,
      sectionHeading: sectionHeading?.trim() || undefined,
      chunkIndex,
      content,
    });
  }
  return { ok: true, value: sources };
}

export function validateTeachBackRequest(
  body: unknown,
): ValidateTeachBackRequestResult {
  if (!isRecord(body)) return fail("Request body must be a JSON object.");

  if (typeof body.conceptTitle !== "string") {
    return fail("Concept title must be a string.");
  }
  const conceptTitle = body.conceptTitle.trim();
  if (conceptTitle.length === 0) return fail("Concept title is required.");
  if (conceptTitle.length > MAX_CONCEPT_TITLE_LENGTH) {
    return fail("Concept title is too long.");
  }

  if (typeof body.learnerExplanation !== "string") {
    return fail("Explanation must be a string.");
  }
  const learnerExplanation = body.learnerExplanation.trim();
  if (learnerExplanation.length < MIN_EXPLANATION_LENGTH) {
    return fail("Explanation is too short to evaluate.");
  }
  if (learnerExplanation.length > MAX_EXPLANATION_LENGTH) {
    return fail("Explanation is too long.");
  }

  const course = validateCourse(body.course);
  if (!course.ok) return course;

  const sources = validateSources(body.sources);
  if (!sources.ok) return sources;

  return {
    ok: true,
    value: {
      conceptTitle,
      learnerExplanation,
      course: course.value,
      sources: sources.value,
    },
  };
}
