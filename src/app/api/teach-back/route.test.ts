// Route-level wiring tests for POST /api/teach-back. The Gemini boundary is
// mocked; these confirm the route uses the shared bounded reader and no-store
// responses, and the not-configured guard.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateMirrorFeedback = vi.fn();
vi.mock("@/lib/mirror/generate-mirror-feedback", () => ({
  generateMirrorFeedback: (...args: unknown[]) => generateMirrorFeedback(...args),
}));

import * as route from "./route";

function validBody(): unknown {
  return {
    conceptTitle: "Fairness in AI",
    learnerExplanation: "Fairness means the model treats groups equitably and avoids bias.",
    course: {
      title: "Responsible AI",
      learnerLevel: "beginner",
      learningObjective: "",
      assistantInstructions: "",
    },
    sources: [
      {
        chunkId: "c1",
        documentId: "d1",
        documentTitle: "Intro",
        chunkIndex: 0,
        content: "Fairness is the principle of equitable treatment across groups.",
      },
    ],
  };
}

function post(body: string, contentType: string | null = "application/json"): Request {
  const headers = new Headers();
  if (contentType !== null) headers.set("content-type", contentType);
  return new Request("https://example.test/api/teach-back", { method: "POST", headers, body });
}

beforeEach(() => {
  generateMirrorFeedback.mockReset();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-real");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/teach-back", () => {
  it("has no GET handler", () => {
    expect((route as Record<string, unknown>).GET).toBeUndefined();
  });

  it("rejects a non-JSON content type with 415", async () => {
    const response = await route.POST(post(JSON.stringify(validBody()), "text/plain"));
    expect(response.status).toBe(415);
    expect(generateMirrorFeedback).not.toHaveBeenCalled();
  });

  it("rejects malformed JSON with 400", async () => {
    const response = await route.POST(post("nope"));
    expect(response.status).toBe(400);
  });

  it("reports not-configured with 503 when the key is absent", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const response = await route.POST(post(JSON.stringify(validBody())));
    expect(response.status).toBe(503);
  });

  it("returns 200 no-store on success", async () => {
    const feedback = {
      feedbackSummary: "Good.",
      correctUnderstanding: [],
      missingPoints: [],
      misconceptions: [],
      improvedExplanation: "",
      masteryRecommendation: "understood",
      masteryRationale: "",
      usedSourceIds: ["c1"],
      memoryEchoPrompt: "What is fairness?",
    };
    generateMirrorFeedback.mockResolvedValue(feedback);
    const response = await route.POST(post(JSON.stringify(validBody())));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ response: feedback });
  });
});
