// The replaceable challenge-generation boundary. Builds the prompt, calls Gemini
// (or an injected mock in tests), detects safety blocks, and validates the
// returned JSON. The low-level Gemini call is the only piece that touches the
// network, so tests pass a mock `generate` and never call the real API.
//
// Reuses the existing server-side Gemini client, the configured model
// (GEMINI_MODEL → gemini-3.1-flash-lite), and the existing AiError categories.

import type { GenerateChallengeRequest, GeneratedMotiChallenge } from "@/lib/types";
import { CANDIDATE_COUNT, GENERATION_TEMPERATURE } from "@/lib/ai/constants";
import { AiError } from "@/lib/ai/error-mapping";
import { createGeminiClient, getConfiguredModel } from "@/lib/ai/gemini-client";
import type {
  GenerateFn,
  GenerateParams,
  RawGenerationResult,
} from "@/lib/ai/generate-moti-response";
import { buildGenerationPrompt } from "./build-challenge-prompts";
import { CHALLENGE_GENERATION_SCHEMA } from "./response-schemas";
import { MAX_CHALLENGE_GENERATION_TOKENS } from "./constants";
import { validateGeneratedChallenge } from "./validate-generated-challenge";

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
      maxOutputTokens: MAX_CHALLENGE_GENERATION_TOKENS,
      candidateCount: CANDIDATE_COUNT,
      responseMimeType: "application/json",
      responseSchema: CHALLENGE_GENERATION_SCHEMA,
      abortSignal: signal,
    },
  });

  return {
    text: response.text,
    finishReason: response.candidates?.[0]?.finishReason,
    blockReason: response.promptFeedback?.blockReason,
  };
}

export interface GenerateChallengeOptions {
  signal: AbortSignal;
  generate?: GenerateFn;
  /**
   * Supplies the challenge id. The server always owns it — it is never read from
   * the model. Injectable so tests are deterministic.
   */
  newChallengeId?: () => string;
}

export async function generateChallenge(
  request: GenerateChallengeRequest,
  {
    signal,
    generate = defaultGenerate,
    newChallengeId = () => crypto.randomUUID(),
  }: GenerateChallengeOptions,
): Promise<GeneratedMotiChallenge> {
  const { systemInstruction, contents } = buildGenerationPrompt(request);

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
  const validated = validateGeneratedChallenge(
    raw.text,
    suppliedSourceIds,
    newChallengeId(),
  );
  if (!validated.ok) {
    throw new AiError("malformed", validated.reason);
  }

  return validated.value;
}
