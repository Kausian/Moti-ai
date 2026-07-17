// Shared JSON response helpers for the AI Route Handlers.
//
// Every AI response — success or error — is uncacheable (`Cache-Control:
// no-store`), because it is personalised and grounded in the learner's own
// material. Errors carry only a safe, pre-mapped public payload: never a raw
// provider message, stack trace, or hidden prompt.

import type { ChatErrorCode, ChatErrorPayload } from "@/lib/types";
import { errorPayload, statusForCode } from "@/lib/ai/error-mapping";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" } as const;

/** A 200 JSON response with the given body, marked no-store. */
export function jsonOk<T>(body: T): Response {
  return Response.json(body, { status: 200, headers: NO_STORE_HEADERS });
}

/** A safe error response built from an already-public error payload. */
export function jsonError(payload: ChatErrorPayload): Response {
  return Response.json(
    { error: payload },
    { status: statusForCode(payload.code), headers: NO_STORE_HEADERS },
  );
}

/** Convenience: build the public payload for a code and respond with it. */
export function jsonErrorForCode(code: ChatErrorCode): Response {
  return jsonError(errorPayload(code));
}
