// The bounded JSON reader's failure modes, expressed as safe error codes that map
// directly onto the shared HTTP status table (413, 415, 400). No raw body, header,
// or parse detail is ever carried on these — only the category.

import type { ChatErrorCode } from "@/lib/types";

/** A read failure, expressed as one of the safe client-error categories. */
export type RequestReadError =
  | { code: "unsupported-media-type" }
  | { code: "payload-too-large" }
  | { code: "invalid-request" };

export type ReadJsonResult =
  | { ok: true; value: unknown }
  | { ok: false; error: RequestReadError };

/** Narrowing helper so a route can map a read failure to the shared error code. */
export function readErrorCode(error: RequestReadError): ChatErrorCode {
  return error.code;
}
