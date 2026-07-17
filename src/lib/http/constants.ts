// Shared limits and accepted content types for the AI Route Handlers. Every AI
// endpoint reads its untrusted JSON body through the same bounded reader, so the
// caps live here rather than being duplicated per route.

/**
 * Maximum accepted request body, in bytes (UTF-8). All current valid requests —
 * a bounded message plus at most four capped source excerpts — sit far below
 * this. The reader stops and rejects (413) once this many bytes have been read,
 * so an attacker cannot stream an unbounded body into memory.
 */
export const MAX_REQUEST_BODY_BYTES = 128 * 1024;

/**
 * Content types the AI routes accept. Browsers send `application/json`; we also
 * tolerate a charset parameter (e.g. `application/json; charset=utf-8`) and the
 * structured-suffix form `application/<subtype>+json`. Anything else is 415.
 */
export const JSON_CONTENT_TYPE = "application/json";
