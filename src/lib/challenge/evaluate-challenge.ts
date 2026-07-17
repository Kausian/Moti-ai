// The challenge-evaluation boundary.
//
// It routes by challenge type, which is the core design decision of this phase:
//
//   - multiple-choice / scenario  → marked DETERMINISTICALLY, with no Gemini call.
//     Comparing a selected option id to the validated correctOptionId is exact,
//     instant, and free; asking a model to do it would add latency, cost, and
//     non-determinism for no benefit.
//   - correct-the-mistake / explain-in-own-words → marked by Gemini, which is
//     genuinely needed to judge free-text conceptual understanding.
//
// In both cases `applyAttemptPolicy` has the final word on mastery, the next
// action, and whether the full explanation is revealed.

import type {
  ChallengeEvaluationResult,
  EvaluateChallengeRequest,
  GeneratedFreeResponseChallenge,
} from "@/lib/types";
import { CANDIDATE_COUNT, GENERATION_TEMPERATURE } from "@/lib/ai/constants";
import { AiError } from "@/lib/ai/error-mapping";
import { createGeminiClient, getConfiguredModel } from "@/lib/ai/gemini-client";
import type {
  GenerateFn,
  GenerateParams,
  RawGenerationResult,
} from "@/lib/ai/generate-moti-response";
import { applyAttemptPolicy, evaluateChoiceChallenge } from "./attempt-policy";
import { buildEvaluationPrompt } from "./build-challenge-prompts";
import { CHALLENGE_EVALUATION_SCHEMA } from "./response-schemas";
import { MAX_CHALLENGE_EVALUATION_TOKENS } from "./constants";
import { validateChallengeEvaluation } from "./validate-challenge-evaluation";
import { isChoiceChallenge } from "./validate-generated-challenge";

async function defaultGenerate({
  model,
  systemInstruction,
  contents,
  signal,
}: GenerateParams): Promise<RawGenerationResult> {
  const ai = createGeminiClient();
  const response = await ai.models.generateContent({
    model,
    contents,
    config: {
      systemInstruction,
      temperature: GENERATION_TEMPERATURE,
      maxOutputTokens: MAX_CHALLENGE_EVALUATION_TOKENS,
      candidateCount: CANDIDATE_COUNT,
      responseMimeType: "application/json",
      responseSchema: CHALLENGE_EVALUATION_SCHEMA,
      abortSignal: signal,
    },
  });

  return {
    text: response.text,
    finishReason: response.candidates?.[0]?.finishReason,
    blockReason: response.promptFeedback?.blockReason,
  };
}

export interface EvaluateChallengeOptions {
  signal: AbortSignal;
  generate?: GenerateFn;
}

export async function evaluateChallenge(
  request: EvaluateChallengeRequest,
  { signal, generate = defaultGenerate }: EvaluateChallengeOptions,
): Promise<ChallengeEvaluationResult> {
  const { challenge, learnerResponse, attemptNumber } = request;

  // Choice challenges never reach the model.
  if (isChoiceChallenge(challenge)) {
    return evaluateChoiceChallenge({
      challenge,
      selectedOptionId: learnerResponse.selectedOptionId ?? "",
      attemptNumber,
    });
  }

  const freeResponse = challenge as GeneratedFreeResponseChallenge;
  const { systemInstruction, contents } = buildEvaluationPrompt({
    ...request,
    challenge: freeResponse,
  });

  const raw = await generate({
    model: getConfiguredModel(),
    systemInstruction,
    contents,
    signal,
  });

  if (raw.blockReason || raw.finishReason === "SAFETY") {
    throw new AiError("safety", "Response blocked by provider safety filters");
  }

  const suppliedSourceIds = request.sources.map((source) => source.chunkId);
  const validated = validateChallengeEvaluation(raw.text, suppliedSourceIds);
  if (!validated.ok) {
    throw new AiError("malformed", validated.reason);
  }

  const content = validated.value;
  // The server, not the model, decides mastery / next action / reveal.
  const policy = applyAttemptPolicy({
    outcome: content.outcome,
    attemptNumber,
    hint: freeResponse.hint,
    fullExplanation: content.explanation,
  });

  return {
    challengeId: freeResponse.challengeId,
    outcome: content.outcome,
    feedback: content.feedback,
    correctUnderstanding: content.correctUnderstanding,
    missingPoints: content.missingPoints,
    correction: content.correction,
    explanation: policy.explanation,
    masteryRecommendation: policy.masteryRecommendation,
    usedSourceIds: content.usedSourceIds,
    nextAction: policy.nextAction,
    memoryEchoPrompt: content.memoryEchoPrompt,
  };
}
