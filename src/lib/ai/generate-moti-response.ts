// The replaceable AI-generation boundary. `generateMotiResponse` builds the
// prompt, calls Gemini (or an injected mock in tests), detects safety blocks,
// and validates the returned JSON. The low-level Gemini call is the only piece
// that touches the network, so tests pass a mock `generate` and never call the
// real API.

import type { MotiChatRequest, MotiStructuredResponse } from "@/lib/types";
import {
  CANDIDATE_COUNT,
  GENERATION_TEMPERATURE,
  MAX_OUTPUT_TOKENS,
} from "./constants";
import { AiError } from "./error-mapping";
import { createGeminiClient, getConfiguredModel } from "./gemini-client";
import { buildPrompt, type PromptContent } from "./prompt-builder";
import { MOTI_RESPONSE_SCHEMA } from "./response-schema";
import { validateAiResponse } from "./validate-ai-response";

export interface RawGenerationResult {
  text: string | undefined;
  finishReason?: string;
  blockReason?: string;
}

export interface GenerateParams {
  model: string;
  systemInstruction: string;
  contents: PromptContent[];
  signal: AbortSignal;
}

export type GenerateFn = (params: GenerateParams) => Promise<RawGenerationResult>;

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
      maxOutputTokens: MAX_OUTPUT_TOKENS,
      candidateCount: CANDIDATE_COUNT,
      responseMimeType: "application/json",
      responseSchema: MOTI_RESPONSE_SCHEMA,
      abortSignal: signal,
    },
  });

  return {
    text: response.text,
    finishReason: response.candidates?.[0]?.finishReason,
    blockReason: response.promptFeedback?.blockReason,
  };
}

export interface GenerateMotiOptions {
  signal: AbortSignal;
  generate?: GenerateFn;
}

export async function generateMotiResponse(
  request: MotiChatRequest,
  { signal, generate = defaultGenerate }: GenerateMotiOptions,
): Promise<MotiStructuredResponse> {
  const { systemInstruction, contents } = buildPrompt(request);

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
  const validated = validateAiResponse(raw.text, suppliedSourceIds);
  if (!validated.ok) {
    throw new AiError("malformed", validated.reason);
  }

  return validated.value;
}
