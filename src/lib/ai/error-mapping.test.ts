import { describe, expect, it } from "vitest";
import { AiError, mapAiError } from "./error-mapping";

function abortError(): Error {
  const error = new Error("aborted");
  error.name = "AbortError";
  return error;
}

describe("mapAiError", () => {
  it("maps a missing API key to not-configured (non-retryable)", () => {
    const payload = mapAiError(new AiError("not-configured"));
    expect(payload.code).toBe("not-configured");
    expect(payload.retryable).toBe(false);
  });

  it("maps authentication failures", () => {
    expect(mapAiError({ status: 401 }).code).toBe("auth-failed");
    expect(mapAiError({ status: 403 }).code).toBe("auth-failed");
  });

  it("maps rate limiting to a retryable error", () => {
    const payload = mapAiError({ status: 429 });
    expect(payload.code).toBe("rate-limited");
    expect(payload.retryable).toBe(true);
  });

  it("maps aborts/timeouts to a retryable timeout", () => {
    const payload = mapAiError(abortError());
    expect(payload.code).toBe("timeout");
    expect(payload.retryable).toBe(true);
  });

  it("maps a safety block", () => {
    expect(mapAiError(new AiError("safety")).code).toBe("safety-blocked");
  });

  it("maps an unavailable model", () => {
    expect(mapAiError({ status: 404 }).code).toBe("model-unavailable");
  });

  it("maps a malformed model response", () => {
    const payload = mapAiError(new AiError("malformed"));
    expect(payload.code).toBe("malformed-response");
    expect(payload.retryable).toBe(true);
  });

  it("maps unknown/provider failures generically", () => {
    expect(mapAiError(new Error("socket hang up")).code).toBe("provider-error");
    expect(mapAiError({ status: 500 }).code).toBe("provider-error");
  });

  it("never leaks the raw provider message", () => {
    const payload = mapAiError(new Error("Gemini internal error 0xDEADBEEF at trace"));
    expect(payload.message).not.toContain("0xDEADBEEF");
  });
});
