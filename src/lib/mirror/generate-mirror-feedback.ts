// The replaceable teach-back generation boundary. `generateMirrorFeedback`
// builds the prompt, calls Gemini (or an injected mock in tests), detects safety
// blocks, and validates the returned JSON. The low-level Gemini call is the only
// piece that touches the network, so tests pass a mock `generate` and never call
// the real API.
//
// It reuses the existing server-side Gemini client, the configured model
// (GEMINI_MODEL → gemini-3.1-flash-lite), and the existing AiError categories —
// only the prompt, schema, and validation are teach-back specific.

import type { MotiMirrorRequest, MotiMirrorStructuredResponse } from "@/lib/types";
import { CANDIDATE_COUNT, GENERATION_TEMPERATURE } from "@/lib/ai/constants";
import { AiError } from "@/lib/ai/error-mapping";
import { createGeminiClient, getConfiguredModel } from "@/lib/ai/gemini-client";
import type { GenerateFn } from "@/lib/ai/generate-moti-response";
import { buildTeachBackPrompt } from "./build-teach-back-prompt";
import { MOTI_MIRROR_RESPONSE_SCHEMA } from "./response-schema";
import { MAX_MIRROR_OUTPUT_TOKENS } from "./constants";
import { validateMirrorResponse } from "./validate-mirror-response";
import type { GenerateParams, RawGenerationResult } from "@/lib/ai/generate-moti-response";

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
      maxOutputTokens: MAX_MIRROR_OUTPUT_TOKENS,
      candidateCount: CANDIDATE_COUNT,
      responseMimeType: "application/json",
      responseSchema: MOTI_MIRROR_RESPONSE_SCHEMA,
      abortSignal: signal,
    },
  });

  return {
    text: response.text,
    finishReason: response.candidates?.[0]?.finishReason,
    blockReason: response.promptFeedback?.blockReason,
  };
}

export interface GenerateMirrorOptions {
  signal: AbortSignal;
  generate?: GenerateFn;
}

export async function generateMirrorFeedback(
  request: MotiMirrorRequest,
  { signal, generate = defaultGenerate }: GenerateMirrorOptions,
): Promise<MotiMirrorStructuredResponse> {
  const { systemInstruction, contents } = buildTeachBackPrompt(request);

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
  const validated = validateMirrorResponse(raw.text, suppliedSourceIds);
  if (!validated.ok) {
    throw new AiError("malformed", validated.reason);
  }

  return validated.value;
}
