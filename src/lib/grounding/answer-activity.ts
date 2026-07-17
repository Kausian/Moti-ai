// Shared, framework-free rules for the learning activities that hang off a
// grounded answer (Moti Mirror teach-back and micro-challenges).
//
// Both activities answer the same two questions identically — "may this answer
// start an activity?" and "what concept is it about?" — so the rule lives once
// here rather than being duplicated (and drifting) per feature.

import type { ConversationMessage, ConversationSource } from "@/lib/types";

/**
 * An activity may only start from a completed, grounded assistant answer that has
 * at least one validated source and a usable concept title. Learner messages,
 * pending/failed messages, insufficient-knowledge, blocked, and clarifying
 * questions are all ineligible — an activity is never run with no source material
 * to ground it against.
 */
export function isGroundedAnswerEligible(message: ConversationMessage): boolean {
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
