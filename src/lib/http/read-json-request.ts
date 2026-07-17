// Bounded, dependency-free JSON body reader shared by every AI Route Handler.
//
// Guarantees, in order:
//   1. Reject unsupported/missing Content-Type with 415 (never guess the format).
//   2. Reject when a present Content-Length already exceeds the limit (413) — a
//      cheap early-out, but Content-Length is a client claim and is never trusted
//      on its own.
//   3. Read the actual body stream with a hard byte budget, cancelling the stream
//      the moment the budget is exceeded, and reject with 413.
//   4. Reject a body that is not valid UTF-8 JSON with 400.
//
// The raw body is never logged and never placed in an error. Parsed data is
// returned as `unknown` for the route-specific validator to narrow.

import { JSON_CONTENT_TYPE, MAX_REQUEST_BODY_BYTES } from "./constants";
import type { ReadJsonResult } from "./request-errors";

/**
 * Accepts `application/json`, `application/json; charset=…`, and the structured
 * suffix `application/<subtype>+json`. The media type is compared
 * case-insensitively and only up to the first `;` (parameters are ignored).
 */
export function isAcceptedJsonContentType(header: string | null): boolean {
  if (!header) return false;
  const mediaType = header.split(";", 1)[0]?.trim().toLowerCase();
  if (!mediaType) return false;
  if (mediaType === JSON_CONTENT_TYPE) return true;
  return mediaType.startsWith("application/") && mediaType.endsWith("+json");
}

function parseContentLength(header: string | null): number | null {
  if (header === null) return null;
  const trimmed = header.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isSafeInteger(value) ? value : null;
}

/**
 * Reads the request stream, stopping as soon as `limit` bytes have arrived. The
 * stream is cancelled on overflow so no more of the body is buffered.
 */
async function readBoundedBytes(
  body: ReadableStream<Uint8Array>,
  limit: number,
): Promise<{ ok: true; bytes: Uint8Array } | { ok: false; reason: "too-large" }> {
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (!value) continue;
      total += value.byteLength;
      if (total > limit) {
        await reader.cancel();
        return { ok: false, reason: "too-large" };
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return { ok: true, bytes };
}

export interface ReadJsonOptions {
  limitBytes?: number;
}

export async function readJsonRequest(
  request: Request,
  { limitBytes = MAX_REQUEST_BODY_BYTES }: ReadJsonOptions = {},
): Promise<ReadJsonResult> {
  if (!isAcceptedJsonContentType(request.headers.get("content-type"))) {
    return { ok: false, error: { code: "unsupported-media-type" } };
  }

  const declaredLength = parseContentLength(request.headers.get("content-length"));
  if (declaredLength !== null && declaredLength > limitBytes) {
    return { ok: false, error: { code: "payload-too-large" } };
  }

  if (request.body === null) {
    // No stream at all (e.g. an empty body): treat as malformed JSON.
    return { ok: false, error: { code: "invalid-request" } };
  }

  let bytes: Uint8Array;
  try {
    const read = await readBoundedBytes(request.body, limitBytes);
    if (!read.ok) {
      return { ok: false, error: { code: "payload-too-large" } };
    }
    bytes = read.bytes;
  } catch {
    // A transport-level read failure (including client disconnect) is surfaced
    // as a generic invalid request; the route separately handles cancellation.
    return { ok: false, error: { code: "invalid-request" } };
  }

  if (bytes.byteLength === 0) {
    return { ok: false, error: { code: "invalid-request" } };
  }

  let text: string;
  try {
    // `fatal` rejects invalid UTF-8 rather than substituting replacement chars.
    text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return { ok: false, error: { code: "invalid-request" } };
  }

  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: { code: "invalid-request" } };
  }
}
