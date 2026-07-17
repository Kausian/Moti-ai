// Route-level wiring tests for POST /api/challenge/generate. Gemini is mocked.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const generateChallenge = vi.fn();
vi.mock("@/lib/challenge/generate-challenge", () => ({
  generateChallenge: (...args: unknown[]) => generateChallenge(...args),
}));

import * as route from "./route";

function validBody(): unknown {
  return {
    conceptTitle: "Fairness in AI",
    requestedType: "multiple-choice",
    difficulty: "beginner",
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
        content: "Fairness is equitable treatment across groups.",
      },
    ],
  };
}

function post(body: string, contentType: string | null = "application/json"): Request {
  const headers = new Headers();
  if (contentType !== null) headers.set("content-type", contentType);
  return new Request("https://example.test/api/challenge/generate", {
    method: "POST",
    headers,
    body,
  });
}

beforeEach(() => {
  generateChallenge.mockReset();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-real");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/challenge/generate", () => {
  it("has no GET handler", () => {
    expect((route as Record<string, unknown>).GET).toBeUndefined();
  });

  it("rejects a non-JSON content type with 415", async () => {
    const response = await route.POST(post(JSON.stringify(validBody()), "text/plain"));
    expect(response.status).toBe(415);
    expect(generateChallenge).not.toHaveBeenCalled();
  });

  it("rejects a body that fails validation with 400", async () => {
    const response = await route.POST(post(JSON.stringify({ conceptTitle: "" })));
    expect(response.status).toBe(400);
    expect(generateChallenge).not.toHaveBeenCalled();
  });

  it("returns 200 no-store on success", async () => {
    const challenge = { id: "x" };
    generateChallenge.mockResolvedValue(challenge);
    const response = await route.POST(post(JSON.stringify(validBody())));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ challenge });
  });
});
