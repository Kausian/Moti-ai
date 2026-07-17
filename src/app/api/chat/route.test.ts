// Route-level tests for POST /api/chat. The Gemini generation boundary is mocked,
// so no test ever calls the real provider. These cover the shared HTTP hardening
// (415/413/400/no-store), the not-configured guard, route-specific validation,
// and the cancellation / timeout / provider-error paths.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AiError } from "@/lib/ai/error-mapping";
import { MAX_REQUEST_BODY_BYTES } from "@/lib/http/constants";

const generateMotiResponse = vi.fn();

vi.mock("@/lib/ai/generate-moti-response", () => ({
  generateMotiResponse: (...args: unknown[]) => generateMotiResponse(...args),
}));

import * as route from "./route";

function validBody(): unknown {
  return {
    message: "What is responsible AI?",
    history: [],
    course: {
      title: "Responsible AI",
      learnerLevel: "beginner",
      learningObjective: "Understand fairness",
      assistantInstructions: "",
    },
    sources: [
      {
        chunkId: "c1",
        documentId: "d1",
        documentTitle: "Intro",
        chunkIndex: 0,
        content: "Responsible AI means fairness and accountability.",
      },
    ],
  };
}

function post(body: string, contentType: string | null = "application/json"): Request {
  const headers = new Headers();
  if (contentType !== null) headers.set("content-type", contentType);
  return new Request("https://example.test/api/chat", {
    method: "POST",
    headers,
    body,
  });
}

const goodResponse = {
  answer: "Responsible AI is about fairness.",
  responseMode: "grounded",
  usedSourceIds: ["c1"],
  suggestedActions: [],
};

beforeEach(() => {
  generateMotiResponse.mockReset();
  vi.stubEnv("GEMINI_API_KEY", "test-key-not-real");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("POST /api/chat — HTTP hardening", () => {
  it("does not export a GET handler", () => {
    expect((route as Record<string, unknown>).GET).toBeUndefined();
  });

  it("returns 415 for an unsupported content type", async () => {
    const response = await route.POST(post(JSON.stringify(validBody()), "text/plain"));
    expect(response.status).toBe(415);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(generateMotiResponse).not.toHaveBeenCalled();
  });

  it("returns 415 for a missing content type", async () => {
    const response = await route.POST(post(JSON.stringify(validBody()), null));
    expect(response.status).toBe(415);
  });

  it("returns 400 for malformed JSON", async () => {
    const response = await route.POST(post("{ broken"));
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("returns 413 when Content-Length exceeds the limit", async () => {
    const request = new Request("https://example.test/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(MAX_REQUEST_BODY_BYTES + 1),
      },
      body: JSON.stringify(validBody()),
    });
    const response = await route.POST(request);
    expect(response.status).toBe(413);
    expect(generateMotiResponse).not.toHaveBeenCalled();
  });

  it("returns 400 for a well-formed body that fails validation", async () => {
    const response = await route.POST(post(JSON.stringify({ message: "" })));
    expect(response.status).toBe(400);
    expect(generateMotiResponse).not.toHaveBeenCalled();
  });

  it("returns 503 when the AI key is not configured", async () => {
    vi.stubEnv("GEMINI_API_KEY", "");
    const response = await route.POST(post(JSON.stringify(validBody())));
    expect(response.status).toBe(503);
    const body = (await response.json()) as { error: { code: string } };
    expect(body.error.code).toBe("not-configured");
  });
});

describe("POST /api/chat — generation outcomes", () => {
  it("returns 200 with the validated response and no-store", async () => {
    generateMotiResponse.mockResolvedValue(goodResponse);
    const response = await route.POST(post(JSON.stringify(validBody())));
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ response: goodResponse });
  });

  it("maps a provider rate-limit to a safe 429 without provider detail", async () => {
    generateMotiResponse.mockRejectedValue(new AiError("rate-limit", "raw quota text 12345"));
    const response = await route.POST(post(JSON.stringify(validBody())));
    expect(response.status).toBe(429);
    const raw = JSON.stringify(await response.json());
    expect(raw).not.toContain("12345");
    expect(raw).not.toContain("quota text");
  });

  it("returns 504 when the generation aborts on the timeout signal", async () => {
    // The client is not aborting, so an abort here is the 45s timeout firing.
    generateMotiResponse.mockRejectedValue(new DOMException("Aborted", "TimeoutError"));
    const response = await route.POST(post(JSON.stringify(validBody())));
    expect(response.status).toBe(504);
  });

  it("returns 499 with no body when the client cancels", async () => {
    const controller = new AbortController();
    const request = new Request("https://example.test/api/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(validBody()),
      signal: controller.signal,
    });
    generateMotiResponse.mockImplementation(async () => {
      controller.abort();
      throw new DOMException("Aborted", "AbortError");
    });
    const response = await route.POST(request);
    expect(response.status).toBe(499);
    expect(await response.text()).toBe("");
  });
});
