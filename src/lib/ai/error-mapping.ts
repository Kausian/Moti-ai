// Maps provider and internal errors into safe, user-facing categories. Raw
// provider errors, stack traces, and secrets are never exposed to the client.

import type { ChatErrorCode, ChatErrorPayload } from "@/lib/types";

export type AiErrorReason =
  | "not-configured"
  | "auth"
  | "rate-limit"
  | "timeout"
  | "safety"
  | "model-unavailable"
  | "malformed"
  | "provider";

/** A typed internal error thrown by the AI boundary. */
export class AiError extends Error {
  readonly reason: AiErrorReason;
  constructor(reason: AiErrorReason, message?: string) {
    super(message ?? reason);
    this.name = "AiError";
    this.reason = reason;
  }
}

const USER_MESSAGES: Record<ChatErrorCode, string> = {
  "invalid-request": "Please check your question and try again.",
  "not-configured": "AI conversation is not configured on this deployment.",
  "auth-failed": "The AI service could not authenticate. Check the server configuration.",
  "model-unavailable": "The configured AI model is currently unavailable.",
  "rate-limited": "Moti has reached the current AI usage limit. Please wait and try again.",
  timeout: "Moti took too long to respond. Please try again.",
  "safety-blocked": "Moti could not answer that request safely.",
  "malformed-response": "Moti returned an unexpected response. Please try again.",
  "provider-error": "Moti could not reach the AI service.",
};

const HTTP_STATUS: Record<ChatErrorCode, number> = {
  "invalid-request": 400,
  "not-configured": 503,
  "auth-failed": 500,
  "model-unavailable": 503,
  "rate-limited": 429,
  timeout: 504,
  "safety-blocked": 422,
  "malformed-response": 502,
  "provider-error": 502,
};

const RETRYABLE: ReadonlySet<ChatErrorCode> = new Set<ChatErrorCode>([
  "rate-limited",
  "timeout",
  "malformed-response",
  "provider-error",
]);

const REASON_TO_CODE: Record<AiErrorReason, ChatErrorCode> = {
  "not-configured": "not-configured",
  auth: "auth-failed",
  "rate-limit": "rate-limited",
  timeout: "timeout",
  safety: "safety-blocked",
  "model-unavailable": "model-unavailable",
  malformed: "malformed-response",
  provider: "provider-error",
};

export function errorPayload(code: ChatErrorCode): ChatErrorPayload {
  return { code, message: USER_MESSAGES[code], retryable: RETRYABLE.has(code) };
}

export function statusForCode(code: ChatErrorCode): number {
  return HTTP_STATUS[code];
}

function isAbortError(error: unknown): boolean {
  return (
    error instanceof Error &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function statusOf(error: unknown): number | undefined {
  if (typeof error === "object" && error !== null && "status" in error) {
    const status = (error as { status: unknown }).status;
    if (typeof status === "number") return status;
  }
  return undefined;
}

/** Maps any thrown error to a safe user-facing category. */
export function mapAiError(error: unknown): ChatErrorPayload {
  if (error instanceof AiError) {
    return errorPayload(REASON_TO_CODE[error.reason]);
  }

  if (isAbortError(error)) {
    return errorPayload("timeout");
  }

  const status = statusOf(error);
  if (status !== undefined) {
    if (status === 401 || status === 403) return errorPayload("auth-failed");
    if (status === 404) return errorPayload("model-unavailable");
    if (status === 429) return errorPayload("rate-limited");
    // 400 and 5xx are provider-side from our server-built request.
    return errorPayload("provider-error");
  }

  return errorPayload("provider-error");
}
