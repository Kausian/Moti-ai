// POST /api/challenge/generate — writes one grounded micro-challenge.
//
// Separate from /api/challenge/evaluate on purpose: generation and evaluation
// have different requests, prompts, schemas, and validators. It is also separate
// from /api/chat and /api/teach-back — a challenge is Moti setting a task, not a
// conversation turn or a teach-back coaching pass.
//
// The API key stays in server environment variables and never reaches the
// browser. Source content is never logged.

import type { ChatErrorPayload, GeneratedMotiChallenge } from "@/lib/types";
import { validateGenerationRequest } from "@/lib/challenge/validate-generation-request";
import { MAX_REQUEST_BODY_BYTES } from "@/lib/chat/constants";
import { generateChallenge } from "@/lib/challenge/generate-challenge";
import { isAiConfigured } from "@/lib/ai/gemini-client";
import { REQUEST_TIMEOUT_MS } from "@/lib/ai/constants";
import { errorPayload, mapAiError, statusForCode } from "@/lib/ai/error-mapping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(payload: ChatErrorPayload): Response {
  return Response.json(
    { error: payload },
    { status: statusForCode(payload.code), headers: { "Cache-Control": "no-store" } },
  );
}

function successResponse(challenge: GeneratedMotiChallenge): Response {
  return Response.json(
    { challenge },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  if (!isAiConfigured()) {
    return errorResponse(errorPayload("not-configured"));
  }

  let rawBody: string;
  try {
    rawBody = await request.text();
  } catch {
    return errorResponse(errorPayload("invalid-request"));
  }
  if (rawBody.length > MAX_REQUEST_BODY_BYTES) {
    return errorResponse(errorPayload("invalid-request"));
  }

  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(rawBody);
  } catch {
    return errorResponse(errorPayload("invalid-request"));
  }

  const validation = validateGenerationRequest(parsedBody);
  if (!validation.ok) {
    // Return a generic message; validation internals are never exposed.
    return errorResponse(errorPayload("invalid-request"));
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutSignal]);

  try {
    const challenge = await generateChallenge(validation.value, { signal });
    return successResponse(challenge);
  } catch (error) {
    // Client disconnected/cancelled: nothing to return; the client discards it.
    if (request.signal.aborted && !timeoutSignal.aborted) {
      return new Response(null, { status: 499 });
    }
    const payload = timeoutSignal.aborted ? errorPayload("timeout") : mapAiError(error);
    return errorResponse(payload);
  }
}
