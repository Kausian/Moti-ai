// POST /api/challenge/generate — writes one grounded micro-challenge.
//
// Separate from /api/challenge/evaluate on purpose: generation and evaluation
// have different requests, prompts, schemas, and validators. It is also separate
// from /api/chat and /api/teach-back — a challenge is Moti setting a task, not a
// conversation turn or a teach-back coaching pass.
//
// The API key stays in server environment variables and never reaches the
// browser. Source content is never logged.

import { validateGenerationRequest } from "@/lib/challenge/validate-generation-request";
import { readJsonRequest } from "@/lib/http/read-json-request";
import { jsonError, jsonErrorForCode, jsonOk } from "@/lib/http/safe-json-response";
import { generateChallenge } from "@/lib/challenge/generate-challenge";
import { isAiConfigured } from "@/lib/ai/gemini-client";
import { REQUEST_TIMEOUT_MS } from "@/lib/ai/constants";
import { errorPayload, mapAiError } from "@/lib/ai/error-mapping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  if (!isAiConfigured()) {
    return jsonErrorForCode("not-configured");
  }

  const body = await readJsonRequest(request);
  if (!body.ok) {
    return jsonErrorForCode(body.error.code);
  }

  const validation = validateGenerationRequest(body.value);
  if (!validation.ok) {
    // Return a generic message; validation internals are never exposed.
    return jsonErrorForCode("invalid-request");
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutSignal]);

  try {
    const challenge = await generateChallenge(validation.value, { signal });
    return jsonOk({ challenge });
  } catch (error) {
    // Client disconnected/cancelled: nothing to return; the client discards it.
    if (request.signal.aborted && !timeoutSignal.aborted) {
      return new Response(null, { status: 499 });
    }
    const payload = timeoutSignal.aborted ? errorPayload("timeout") : mapAiError(error);
    return jsonError(payload);
  }
}
