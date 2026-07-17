// POST /api/chat — the only place Gemini is called. The API key stays in server
// environment variables and never reaches the browser. Flow: validate untrusted
// input → build a grounded prompt from the client-supplied source excerpts →
// call Gemini with a hard timeout → validate the structured response → return it.
// Retrieval itself already happened locally in the browser; this endpoint does
// not read documents or perform search.

import { validateChatRequest } from "@/lib/chat/validate-chat-request";
import { readJsonRequest } from "@/lib/http/read-json-request";
import { jsonError, jsonErrorForCode, jsonOk } from "@/lib/http/safe-json-response";
import { generateMotiResponse } from "@/lib/ai/generate-moti-response";
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

  const validation = validateChatRequest(body.value);
  if (!validation.ok) {
    // Return a generic message; validation internals are never exposed.
    return jsonErrorForCode("invalid-request");
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutSignal]);

  try {
    const response = await generateMotiResponse(validation.value, { signal });
    return jsonOk({ response });
  } catch (error) {
    // Client disconnected/cancelled: nothing to return; the client discards it.
    if (request.signal.aborted && !timeoutSignal.aborted) {
      return new Response(null, { status: 499 });
    }
    const payload = timeoutSignal.aborted ? errorPayload("timeout") : mapAiError(error);
    return jsonError(payload);
  }
}
