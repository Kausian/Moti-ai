// POST /api/challenge/evaluate — marks a learner's answer to one challenge.
//
// The challenge object arrives from the browser and is fully re-validated here:
// client-held challenge state is untrusted input, not trusted state.
//
// Choice challenges are marked deterministically and never reach Gemini (see
// lib/challenge/evaluate-challenge). Free-response answers do call Gemini, but
// the server still owns the mastery recommendation and the next action.
//
// Learner answers and source content are never logged.

import type { ChallengeEvaluationResult, ChatErrorPayload } from "@/lib/types";
import { validateEvaluationRequest } from "@/lib/challenge/validate-evaluation-request";
import { MAX_REQUEST_BODY_BYTES } from "@/lib/chat/constants";
import { evaluateChallenge } from "@/lib/challenge/evaluate-challenge";
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

function successResponse(result: ChallengeEvaluationResult): Response {
  return Response.json(
    { result },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request: Request): Promise<Response> {
  // Marking a choice answer needs no model, but this endpoint also serves
  // free-response marking, so it reports honestly when AI is unconfigured.
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

  const validation = validateEvaluationRequest(parsedBody);
  if (!validation.ok) {
    return errorResponse(errorPayload("invalid-request"));
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutSignal]);

  try {
    const result = await evaluateChallenge(validation.value, { signal });
    return successResponse(result);
  } catch (error) {
    if (request.signal.aborted && !timeoutSignal.aborted) {
      return new Response(null, { status: 499 });
    }
    const payload = timeoutSignal.aborted ? errorPayload("timeout") : mapAiError(error);
    return errorResponse(payload);
  }
}
