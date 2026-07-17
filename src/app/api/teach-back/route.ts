// POST /api/teach-back — Moti Mirror teach-back evaluation.
//
// A separate route from /api/chat on purpose: teach-back has its own request
// shape (a concept + an explanation, and deliberately NO conversation history),
// its own layered prompt with an evaluation rubric, its own response schema, and
// its own consistency rules. Overloading /api/chat with a mode flag would couple
// two contracts and weaken both validators.
//
// Flow: validate untrusted input → build the rubric prompt from the answer's
// validated source excerpts → call Gemini with a hard timeout → validate the
// structured response → return it. The API key stays in server environment
// variables and never reaches the browser. Learner explanations and source
// content are never logged.

import type { ChatErrorPayload, MotiMirrorStructuredResponse } from "@/lib/types";
import { validateTeachBackRequest } from "@/lib/mirror/validate-teach-back-request";
import { MAX_REQUEST_BODY_BYTES } from "@/lib/chat/constants";
import { generateMirrorFeedback } from "@/lib/mirror/generate-mirror-feedback";
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

function successResponse(response: MotiMirrorStructuredResponse): Response {
  return Response.json(
    { response },
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

  const validation = validateTeachBackRequest(parsedBody);
  if (!validation.ok) {
    // Return a generic message; validation internals are never exposed.
    return errorResponse(errorPayload("invalid-request"));
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutSignal]);

  try {
    const response = await generateMirrorFeedback(validation.value, { signal });
    return successResponse(response);
  } catch (error) {
    // Client disconnected/cancelled: nothing to return; the client discards it.
    if (request.signal.aborted && !timeoutSignal.aborted) {
      return new Response(null, { status: 499 });
    }
    const payload = timeoutSignal.aborted ? errorPayload("timeout") : mapAiError(error);
    return errorResponse(payload);
  }
}
