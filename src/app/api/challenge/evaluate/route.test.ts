// Route-level wiring tests for POST /api/challenge/evaluate. The evaluation
// boundary is mocked; these confirm shared reader wiring and no-store responses.
// Deterministic choice marking vs. Gemini free-response marking is covered by the
// lib/challenge unit tests.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const evaluateChallenge = vi.fn();
vi.mock("@/lib/challenge/evaluate-challenge", () => ({
  evaluateChallenge: (...args: unknown[]) => evaluateChallenge(...args),
}));

import * as route from "./route";

function post(body: string, contentType: string | null = "application/json"): Request {
  const headers = new Headers();
  if (contentType !== null) headers.set("content-type", contentType);
  return new Request("https://example.test/api/challenge/evaluate", {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  evaluateChallenge.mockReset();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-real");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/challenge/evaluate", () => {
  it("has no GET handler", () => {
    expect((route as Record<string, unknown>).GET).toBeUndefined();
  });

  it("rejects a non-JSON content type with 415 before evaluating", async () => {
    const response = await route.POST(post("{}", "text/plain"));
    expect(response.status).toBe(415);
    expect(evaluateChallenge).not.toHaveBeenCalled();
  });

  it("rejects an unvalidatable body with 400", async () => {
    const response = await route.POST(post(JSON.stringify({ nope: true })));
    expect(response.status).toBe(400);
    expect(evaluateChallenge).not.toHaveBeenCalled();
  });

  it("reports not-configured with 503 when the key is absent", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const response = await route.POST(post(JSON.stringify({ nope: true })));
    expect(response.status).toBe(503);
  });
});
