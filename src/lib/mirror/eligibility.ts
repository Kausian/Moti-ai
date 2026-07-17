// Pure rules deciding when a teach-back may start, and what concept it is about.
// Framework-free so they can be unit-tested without React.
//
// The "eligible grounded answer" and "concept title" rules are shared with
// micro-challenges (Phase 8) and live in lib/grounding/answer-activity.

import type { ConversationMessage, ConversationSource, TeachBackSourceInput } from "@/lib/types";
import {
  deriveConceptTitle,
  isGroundedAnswerEligible,
} from "@/lib/grounding/answer-activity";

export { deriveConceptTitle };

/**
 * Teach-back is offered only for a completed, grounded assistant answer that has
 * at least one validated source — we never evaluate an explanation with no source
 * material to judge it against.
 */
export function isTeachBackEligible(message: ConversationMessage): boolean {
  return isGroundedAnswerEligible(message);
}

/**
 * Maps the answer's validated sources to the teach-back request payload. Only
 * the excerpts already attached to that answer are sent — never the document
 * collection or the retrieval index.
 */
export function toTeachBackSources(
  sources: ConversationSource[],
): TeachBackSourceInput[] {
  return sources.map((source) => ({
    chunkId: source.id,
    documentId: source.documentId,
    documentTitle: source.documentTitle,
    sectionHeading: source.sectionHeading,
    chunkIndex: source.chunkIndex,
    content: source.content,
  }));
}
