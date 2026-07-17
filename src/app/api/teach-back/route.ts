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

import { validateTeachBackRequest } from "@/lib/mirror/validate-teach-back-request";
import { readJsonRequest } from "@/lib/http/read-json-request";
import { jsonError, jsonErrorForCode, jsonOk } from "@/lib/http/safe-json-response";
import { generateMirrorFeedback } from "@/lib/mirror/generate-mirror-feedback";
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

  const validation = validateTeachBackRequest(body.value);
  if (!validation.ok) {
    // Return a generic message; validation internals are never exposed.
    return jsonErrorForCode("invalid-request");
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutSignal]);

  try {
    const response = await generateMirrorFeedback(validation.value, { signal });
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
