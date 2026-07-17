import { describe, expect, it } from "vitest";
import {
  isAcceptedJsonContentType,
  readJsonRequest,
} from "./read-json-request";
import { jsonError, jsonErrorForCode, jsonOk } from "./safe-json-response";
import { MAX_REQUEST_BODY_BYTES } from "./constants";
import { errorPayload } from "@/lib/ai/error-mapping";

function jsonRequest(body: string, contentType = "application/json"): Request {
  return new Request("https://example.test/api/chat", {
    method: "POST",
    headers: { "content-type": contentType },
    body,
  });
}

describe("isAcceptedJsonContentType", () => {
  it("accepts application/json and charset variants", () => {
    expect(isAcceptedJsonContentType("application/json")).toBe(true);
    expect(isAcceptedJsonContentType("application/json; charset=utf-8")).toBe(true);
    expect(isAcceptedJsonContentType("APPLICATION/JSON")).toBe(true);
  });

  it("accepts application/*+json structured suffix", () => {
    expect(isAcceptedJsonContentType("application/ld+json")).toBe(true);
  });

  it("rejects missing or non-JSON content types", () => {
    expect(isAcceptedJsonContentType(null)).toBe(false);
    expect(isAcceptedJsonContentType("")).toBe(false);
    expect(isAcceptedJsonContentType("text/plain")).toBe(false);
    expect(isAcceptedJsonContentType("multipart/form-data")).toBe(false);
    expect(isAcceptedJsonContentType("application/xml")).toBe(false);
  });
});

describe("readJsonRequest", () => {
  it("parses a valid JSON body", async () => {
    const result = await readJsonRequest(jsonRequest(JSON.stringify({ a: 1 })));
    expect(result).toEqual({ ok: true, value: { a: 1 } });
  });

  it("rejects an unsupported content type with unsupported-media-type", async () => {
    const result = await readJsonRequest(jsonRequest("{}", "text/plain"));
    expect(result).toEqual({ ok: false, error: { code: "unsupported-media-type" } });
  });

  it("rejects a missing content type with unsupported-media-type", async () => {
    const request = new Request("https://example.test/api/chat", {
      method: "POST",
      body: "{}",
    });
    // Undici defaults a string body to text/plain; strip it to simulate absence.
    request.headers.delete("content-type");
    const result = await readJsonRequest(request);
    expect(result).toEqual({ ok: false, error: { code: "unsupported-media-type" } });
  });

  it("rejects malformed JSON with invalid-request", async () => {
    const result = await readJsonRequest(jsonRequest("{ not json "));
    expect(result).toEqual({ ok: false, error: { code: "invalid-request" } });
  });

  it("rejects an empty body with invalid-request", async () => {
    const result = await readJsonRequest(jsonRequest(""));
    expect(result).toEqual({ ok: false, error: { code: "invalid-request" } });
  });

  it("rejects when Content-Length claims more than the limit (413)", async () => {
    const request = new Request("https://example.test/api/chat", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "content-length": String(MAX_REQUEST_BODY_BYTES + 1),
      },
      body: "{}",
    });
    const result = await readJsonRequest(request);
    expect(result).toEqual({ ok: false, error: { code: "payload-too-large" } });
  });

  it("rejects an actually oversized streamed body with 413", async () => {
    const oversized = JSON.stringify({ a: "x".repeat(MAX_REQUEST_BODY_BYTES) });
    const result = await readJsonRequest(jsonRequest(oversized), { limitBytes: 1024 });
    expect(result).toEqual({ ok: false, error: { code: "payload-too-large" } });
  });

  it("accepts a body exactly at the limit", async () => {
    // Build a JSON string whose UTF-8 byte length is exactly the limit.
    const overhead = '{"a":""}'.length;
    const value = "x".repeat(64 - overhead);
    const body = JSON.stringify({ a: value });
    expect(new TextEncoder().encode(body).byteLength).toBe(64);
    const result = await readJsonRequest(jsonRequest(body), { limitBytes: 64 });
    expect(result.ok).toBe(true);
  });

  it("counts UTF-8 bytes, not string length, against the limit", async () => {
    // "€" is 1 UTF-16 code unit but 3 UTF-8 bytes.
    const body = JSON.stringify({ a: "€€€€" }); // 12 bytes of euro + overhead
    const result = await readJsonRequest(jsonRequest(body), { limitBytes: 10 });
    expect(result).toEqual({ ok: false, error: { code: "payload-too-large" } });
  });

  it("decodes valid UTF-8 unicode content", async () => {
    const result = await readJsonRequest(jsonRequest(JSON.stringify({ a: "café — 日本語" })));
    expect(result).toEqual({ ok: true, value: { a: "café — 日本語" } });
  });
});

describe("safe JSON responses", () => {
  it("marks success responses no-store", async () => {
    const response = jsonOk({ ok: 1 });
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ ok: 1 });
  });

  it("maps error codes to statuses and stays no-store", async () => {
    const tooLarge = jsonErrorForCode("payload-too-large");
    expect(tooLarge.status).toBe(413);
    expect(tooLarge.headers.get("cache-control")).toBe("no-store");

    const unsupported = jsonErrorForCode("unsupported-media-type");
    expect(unsupported.status).toBe(415);

    const invalid = jsonErrorForCode("invalid-request");
    expect(invalid.status).toBe(400);
  });

  it("emits only the safe public payload, never provider detail", async () => {
    const response = jsonError(errorPayload("provider-error"));
    const body = (await response.json()) as { error: { code: string; message: string } };
    expect(body.error.code).toBe("provider-error");
    expect(body.error.message).toBe("Moti could not reach the AI service.");
    expect(JSON.stringify(body)).not.toMatch(/stack|Error:|at /);
  });
});
