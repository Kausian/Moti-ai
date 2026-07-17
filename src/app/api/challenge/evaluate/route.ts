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

import { validateEvaluationRequest } from "@/lib/challenge/validate-evaluation-request";
import { readJsonRequest } from "@/lib/http/read-json-request";
import { jsonError, jsonErrorForCode, jsonOk } from "@/lib/http/safe-json-response";
import { evaluateChallenge } from "@/lib/challenge/evaluate-challenge";
import { isAiConfigured } from "@/lib/ai/gemini-client";
import { REQUEST_TIMEOUT_MS } from "@/lib/ai/constants";
import { errorPayload, mapAiError } from "@/lib/ai/error-mapping";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request): Promise<Response> {
  // Marking a choice answer needs no model, but this endpoint also serves
  // free-response marking, so it reports honestly when AI is unconfigured.
  if (!isAiConfigured()) {
    return jsonErrorForCode("not-configured");
  }

  const body = await readJsonRequest(request);
  if (!body.ok) {
    return jsonErrorForCode(body.error.code);
  }

  const validation = validateEvaluationRequest(body.value);
  if (!validation.ok) {
    return jsonErrorForCode("invalid-request");
  }

  const timeoutSignal = AbortSignal.timeout(REQUEST_TIMEOUT_MS);
  const signal = AbortSignal.any([request.signal, timeoutSignal]);

  try {
    const result = await evaluateChallenge(validation.value, { signal });
    return jsonOk({ result });
  } catch (error) {
    if (request.signal.aborted && !timeoutSignal.aborted) {
      return new Response(null, { status: 499 });
    }
    const payload = timeoutSignal.aborted ? errorPayload("timeout") : mapAiError(error);
    return jsonError(payload);
  }
}
