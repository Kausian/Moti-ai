// Pure rules deciding when a micro-challenge may start, and what it is about.
// Framework-free so they can be unit-tested without React.

import type {
  ChallengeSourceInput,
  ConversationMessage,
  ConversationSource,
  MotiChallengeDifficulty,
} from "@/lib/types";
import { isGroundedAnswerEligible } from "@/lib/grounding/answer-activity";

export { deriveConceptTitle } from "@/lib/grounding/answer-activity";

/**
 * "Challenge me" is offered only for a completed, grounded assistant answer with
 * at least one validated source — a challenge is never generated from nothing.
 */
export function isChallengeEligible(message: ConversationMessage): boolean {
  return isGroundedAnswerEligible(message);
}

/**
 * Maps the answer's validated sources to the challenge request payload. Only the
 * excerpts already attached to that answer are sent — never the document
 * collection or the retrieval index.
 */
export function toChallengeSources(
  sources: ConversationSource[],
): ChallengeSourceInput[] {
  return sources.map((source) => ({
    chunkId: source.id,
    documentId: source.documentId,
    documentTitle: source.documentTitle,
    sectionHeading: source.sectionHeading,
    chunkIndex: source.chunkIndex,
    content: source.content,
  }));
}

/**
 * "Recommended" difficulty simply follows the configured learner level. It is a
 * starting point for how the challenge is written, not a claim about ability.
 */
export function recommendedDifficulty(
  learnerLevel: MotiChallengeDifficulty,
): MotiChallengeDifficulty {
  return learnerLevel;
}
