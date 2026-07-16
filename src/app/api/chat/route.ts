// POST /api/chat — the only place Gemini is called. The API key stays in server
// environment variables and never reaches the browser. Flow: validate untrusted
// input → build a grounded prompt from the client-supplied source excerpts →
// call Gemini with a hard timeout → validate the structured response → return it.
// Retrieval itself already happened locally in the browser; this endpoint does
// not read documents or perform search.

import type { ChatErrorPayload, MotiStructuredResponse } from "@/lib/types";
import { validateChatRequest } from "@/lib/chat/validate-chat-request";
import { MAX_REQUEST_BODY_BYTES } from "@/lib/chat/constants";
import { generateMotiResponse } from "@/lib/ai/generate-moti-response";
import { isAiConfigured } from "@/lib/ai/gemini-client";
import { REQUEST_TIMEOUT_MS } from "@/lib/ai/constants";
import {
  errorPayload,
  mapAiError,
  statusForCode,
} from "@/lib/ai/error-mapping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(payload: ChatErrorPayload): Response {
  return Response.json(
    { error: payload },
    { status: statusForCode(payload.code), headers: { "Cache-Control": "no-store" } },
  );
}

function successResponse(response: MotiStructuredResponse): Response {
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

  const validation = validateChatRequest(parsedBody);
  if (!validation.ok) {
    // Return a generic message; validation internals are never exposed.
    return errorResponse(errorPayload("invalid-request"));
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutSignal]);

  try {
    const response = await generateMotiResponse(validation.value, { signal });
    return successResponse(response);
  } catch (error) {
    // Client disconnected/cancelled: nothing to return; the client discards it.
    if (request.signal.aborted && !timeoutSignal.aborted) {
      return new Response(null, { status: 499 });
    }
    const payload = timeoutSignal.aborted
      ? errorPayload("timeout")
      : mapAiError(error);
    return errorResponse(payload);
  }
}
