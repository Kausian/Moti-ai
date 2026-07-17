// Pure rules deciding when a teach-back may start, and what concept it is about.
// Framework-free so they can be unit-tested without React.

import type {
  ConversationMessage,
  ConversationSource,
  TeachBackSourceInput,
} from "@/lib/types";

/**
 * Teach-back is offered only for a completed, grounded assistant answer that has
 * at least one validated source. Learner messages, pending/failed messages,
 * insufficient-knowledge, blocked, clarifying questions, and answers with no
 * validated source are all ineligible — we never evaluate an explanation with no
 * source material to judge it against.
 */
export function isTeachBackEligible(message: ConversationMessage): boolean {
  return (
    message.role === "assistant" &&
    message.status === "complete" &&
    message.responseMode === "grounded-answer" &&
    (message.sources?.length ?? 0) > 0 &&
    deriveConceptTitle(message.sources ?? []) !== null
  );
}

/**
 * The concept comes from the first validated source: its section heading when
 * present, otherwise its document title. When neither yields a usable title the
 * activity must not begin.
 */
export function deriveConceptTitle(sources: ConversationSource[]): string | null {
  const first = sources[0];
  if (!first) return null;

  const heading = first.sectionHeading?.trim();
  if (heading && heading.length > 0) return heading;

  const title = first.documentTitle.trim();
  return title.length > 0 ? title : null;
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
