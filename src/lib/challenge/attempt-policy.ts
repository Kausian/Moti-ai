// The adaptive two-attempt policy, and the deterministic evaluation of choice
// challenges. Both are pure and framework-free, so every rule is unit-testable.
//
// The server — not the model — is authoritative for mastery, the next action, and
// whether the full explanation is revealed. That is deliberate defence in depth:
// even if a model (or an injected instruction) tried to grant "understood" for a
// wrong answer, or offer a retry after attempts are exhausted, this policy wins.

import type {
  ChallengeEvaluationResult,
  ChallengeNextAction,
  ChallengeOutcome,
  GeneratedChoiceChallenge,
  MotiMirrorMasteryRecommendation,
} from "@/lib/types";
import { MAX_CHALLENGE_ATTEMPTS } from "./constants";

export interface AttemptPolicyInput {
  outcome: ChallengeOutcome;
  /** 1-based. */
  attemptNumber: number;
  /** The targeted nudge shown instead of the answer after a first failure. */
  hint: string;
  /** The full grounded explanation, revealed once retries are exhausted. */
  fullExplanation: string;
}

export interface AttemptPolicy {
  masteryRecommendation: MotiMirrorMasteryRecommendation;
  nextAction: ChallengeNextAction;
  /** What the learner is actually shown for this attempt. */
  explanation: string;
  /** True when the full grounded explanation has been revealed. */
  revealed: boolean;
}

/**
 * Resolves outcome + attempt number to the app's coaching policy:
 *
 * - correct           → understood (first try) or developing (after a retry);
 *                       full explanation; offer another challenge.
 * - partially-correct → developing
 * - incorrect         → exploring
 *   ...for both: a first failure shows only a hint and offers a Retry; once
 *   attempts are exhausted the full explanation is shown and the source is
 *   recommended. There are no unlimited retries.
 * - not-evaluated     → no mastery claim and no explanation at all.
 */
export function applyAttemptPolicy(input: AttemptPolicyInput): AttemptPolicy {
  const { outcome, attemptNumber, hint, fullExplanation } = input;

  if (outcome === "not-evaluated") {
    return {
      masteryRecommendation: "not-evaluated",
      nextAction: "continue",
      explanation: "",
      revealed: false,
    };
  }

  if (outcome === "correct") {
    return {
      // A correct answer that needed a second attempt is still developing.
      masteryRecommendation: attemptNumber === 1 ? "understood" : "developing",
      nextAction: "try-another",
      explanation: fullExplanation,
      revealed: true,
    };
  }

  const masteryRecommendation: MotiMirrorMasteryRecommendation =
    outcome === "partially-correct" ? "developing" : "exploring";

  const retriesRemain = attemptNumber < MAX_CHALLENGE_ATTEMPTS;
  return {
    masteryRecommendation,
    nextAction: retriesRemain ? "retry" : "review-source",
    // Withhold the answer while a retry is still useful.
    explanation: retriesRemain ? hint : fullExplanation,
    revealed: !retriesRemain,
  };
}

/**
 * Evaluates a choice challenge deterministically by comparing the selected option
 * to the validated `correctOptionId`. Comparing two ids needs no model, so this
 * never calls Gemini — it is exact, instant, and free.
 *
 * Feedback comes from the challenge's already-validated reference explanation, so
 * it stays grounded in the sources the challenge was generated from.
 */
export function evaluateChoiceChallenge(input: {
  challenge: GeneratedChoiceChallenge;
  selectedOptionId: string;
  attemptNumber: number;
}): ChallengeEvaluationResult {
  const { challenge, selectedOptionId, attemptNumber } = input;
  const isCorrect = selectedOptionId === challenge.correctOptionId;
  // A choice is right or wrong; there is no partial credit to award.
  const outcome: ChallengeOutcome = isCorrect ? "correct" : "incorrect";

  const policy = applyAttemptPolicy({
    outcome,
    attemptNumber,
    hint: challenge.hint,
    fullExplanation: challenge.referenceExplanation,
  });

  return {
    challengeId: challenge.challengeId,
    outcome,
    feedback: isCorrect
      ? "You identified the correct option."
      : policy.revealed
        ? "That option is not the one the source supports."
        : "That is not the option the source supports — here is a nudge before you try again.",
    correctUnderstanding: [],
    missingPoints: [],
    explanation: policy.explanation,
    masteryRecommendation: policy.masteryRecommendation,
    // Only the ids already validated against the supplied sources.
    usedSourceIds: challenge.usedSourceIds,
    nextAction: policy.nextAction,
  };
}
