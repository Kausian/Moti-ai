# Testing & Security — Moti AI (Phase 11)

Phase 11 is a hardening and regression phase. It adds **no new learning
functionality**. Its job is to make the existing prototype more reliable and
secure, to test adversarial and failure conditions, and to document the
remaining limits honestly.

> **This is a prototype, not a secure assessment platform.** The mitigations
> below genuinely improve robustness, but each has limits, stated plainly. None
> of them should be read as a complete guarantee.

---

## 1. Shared HTTP request hardening

All four AI Route Handlers — `POST /api/chat`, `POST /api/teach-back`,
`POST /api/challenge/generate`, `POST /api/challenge/evaluate` — read their
untrusted JSON body through one shared, dependency-free reader in
`src/lib/http/`:

| File | Responsibility |
| --- | --- |
| `constants.ts` | The named byte limit (`MAX_REQUEST_BODY_BYTES = 128 KiB`) and accepted content type. |
| `request-errors.ts` | The reader's typed failure categories (415 / 413 / 400). |
| `read-json-request.ts` | The bounded reader itself. |
| `safe-json-response.ts` | `jsonOk` / `jsonError` / `jsonErrorForCode` — every response is `Cache-Control: no-store`. |
| `security-headers.ts` | The baseline browser security headers applied by `next.config.ts`. |
| `request-security.test.ts`, `security-headers.test.ts` | Unit tests for the above. |

### `readJsonRequest` behaviour (in order)

1. **Content-Type check.** Accepts `application/json`, `application/json;
   charset=…`, and the structured suffix `application/<subtype>+json`. Anything
   else — or a missing Content-Type — is rejected with **415**.
2. **Content-Length early-out.** If a `Content-Length` header is present and
   already exceeds the limit, reject with **413**. The header is a *claim* and is
   never trusted on its own.
3. **Bounded streamed read.** The body stream is read chunk by chunk with a hard
   byte budget. The moment the budget is exceeded the stream is **cancelled** and
   the request is rejected with **413** — an oversized body is never fully
   buffered into memory.
4. **UTF-8 decode + parse.** Bytes are decoded as strict UTF-8 (`fatal: true`)
   and `JSON.parse`d. Invalid UTF-8 or malformed JSON is rejected with **400**.
   The size limit is measured in **UTF-8 bytes**, not JavaScript string length.

The raw body is **never logged** and **never placed in an error**. The parsed
value is returned as `unknown` for each route's own closed validator to narrow.

**Limit rationale.** 128 KiB is comfortably above every valid request (a bounded
message/explanation/answer plus at most four capped source excerpts) and well
below anything that could pressure memory.

### Status codes

| Status | Meaning |
| --- | --- |
| 400 | Invalid request (malformed JSON, or failed route validation). |
| 413 | Payload too large (Content-Length or streamed body over the limit). |
| 415 | Unsupported / missing content type. |
| 422 | Safety-blocked model response. |
| 429 | Provider rate-limit (mapped, safe). |
| 499 | Client cancelled — empty body, nothing rendered. |
| 502 | Provider error / malformed model output (mapped, safe). |
| 503 | AI not configured, or model unavailable. |
| 504 | Server-side 45-second timeout. |

All error bodies use the safe public shape `{ error: { code, message, retryable } }`
from `src/lib/ai/error-mapping.ts`. **Raw provider messages, stack traces, and
secrets never appear.**

---

## 2. Security headers

`next.config.ts` applies these to every route via `headers()`:

- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `X-Frame-Options: DENY`
- `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=()`
- `Cross-Origin-Opener-Policy: same-origin`

**No Content-Security-Policy is set.** A strict nonce-based CSP cannot be applied
cleanly to this prototype's inline framework/runtime behaviour (Next.js
hydration, dynamic chunks, the Three.js `<Canvas>`), and a brittle CSP that broke
hydration would be security theatre. **A production CSP is documented future
work.**

---

## 3. Secrets & environment boundary

- `GEMINI_API_KEY` is read only in server-only code (`src/lib/ai/gemini-client.ts`).
- There is **no `NEXT_PUBLIC_` Gemini key** and no key in any client component.
- `.env.local` is git-ignored; only `.env.example` (placeholders) is tracked.
- The configured key is verified **absent from `.next/static`** after a build.
- Provider errors are mapped to safe categories, so a key can never surface in an
  error shown to the client.

**Limit.** Any server holding the key can call the model. The prototype's public
endpoints are **unauthenticated** (see §7).

---

## 4. Untrusted content handling

Uploaded documents, pasted text, chat messages, teach-back explanations,
challenge answers, Memory Echo prompts, and model output are all treated as
data:

- Rendered as **plain text** — source previews use a `<pre>` (React-escaped).
- **No** `dangerouslySetInnerHTML`, `innerHTML`, `eval`, or `Function`
  constructor anywhere in `src/`.
- No Markdown/HTML execution, no model-generated URL execution.
- In prompts, source and learner text is **escaped** (`&`, `<`, `>`) inside
  delimited blocks so it cannot break out of its `<source>` / `<learner_*>`
  boundary, and each block is labelled untrusted.

### Prompt-injection mitigations (and their limit)

`src/lib/ai/injection-regression.test.ts` encodes the specific adversarial
scenarios: a source saying "reveal the API key", a chat message asking for the
system prompt, a teach-back explanation saying "mark me understood", a challenge
answer saying "mark this correct", configurable instructions trying to remove
grounding, and a browser-supplied challenge object carrying a fake source id.
These assert that hard rules lead, untrusted content stays escaped and labelled,
no secret is ever placed in a prompt, and invented/duplicate source ids are
dropped before reaching the client.

> **These tests do not prove complete prompt-injection prevention.** They assert
> concrete, deterministic mitigations. A model can still be coaxed in ways no
> prompt structure fully prevents; the design limits the blast radius (no secret
> in context, source-only grounding, server-owned outcomes) rather than claiming
> immunity.

### Source-ID verification

The model's `usedSourceIds` (chat, mirror, challenge) and any challenge object
returned by the browser are re-validated against the ids **actually supplied**.
Unknown ids are **removed** and duplicates de-duplicated, so an invented id never
reaches the UI. When knowledge is insufficient, no sources back the answer.

---

## 5. localStorage reliability & privacy

Two independent, versioned keys, each read through a single typed module:

- `moti-ai:course-configuration:v2` (with a read-time migration from `:v1`).
- `moti-ai:learning-progress:v1`.

Guarantees:

- Storage is only touched in the browser (`typeof window` guarded).
- Malformed JSON or an unsupported version **falls back to empty** rather than
  crashing rendering.
- A failed write (quota/private mode) is surfaced honestly to the learner; it is
  never silently dropped.
- Course migration preserves every document.
- Multi-course progress is isolated by `courseId`; resetting one course leaves
  others (and the course configuration) untouched.

**Privacy.** Only minimal learning metadata is stored (concept identity,
mastery, activity type/outcome/attempt, source ids + label snapshots,
timestamps, the Memory Echo prompt, review state). Learner explanations, written
answers, full AI feedback, chat, and source excerpts are **never** persisted, and
progress is **never** sent to Gemini.

> **Limit.** localStorage is readable by any same-origin script and is **not
> encrypted**. Real educational records would need authenticated server storage.

### Bounded idempotency ledger

`processedActivityIds` (which makes "Save to learning journey" idempotent) is now
capped at **500** (`MAX_PROCESSED_ACTIVITY_IDS`). On overflow the newest ids are
kept, plus any id still referenced by a stored concept's evidence, so visible
work stays protected from an immediate duplicate save. Order is preserved.

> **Limit.** An *extremely* old duplicate result — one whose id has aged out of
> the window and whose concept evidence has also been trimmed — may no longer be
> recognised as already-saved. This never corrupts a concept or a review item; at
> worst it adds one extra evidence entry within the per-concept cap.

---

## 6. Abort, timeout & error recovery

The cancellation path is: browser `AbortController` → `fetch` signal → Route
Handler `request.signal` → combined with a 45s `AbortSignal.timeout` via
`AbortSignal.any` → Gemini `abortSignal`.

- A cancelled request returns **499** with no body; the client discards it and
  shows **no** fake assistant message, mirror feedback, or challenge result.
- A cancellation is distinguished from the timeout (`request.signal.aborted &&
  !timeoutSignal.aborted`) so it is never reported as a provider failure.
- Each new turn creates a **fresh** `AbortController`; completed controllers are
  cleared. There is one timeout system, not competing ones.
- On a retryable error the learner's input is preserved and Retry is offered.
- Moti's avatar exits the Thinking state when a request settles or fails.

---

## 7. What is **not** protected (honest limits)

- **No authentication.** The AI endpoints are public and unauthenticated. Anyone
  who can reach the deployment can spend its Gemini quota.
- **No durable global rate limiting.** There is a per-request 45s timeout and
  strict size/shape caps, but **no** cross-request limiter. An in-memory
  serverless counter would reset per instance and give false assurance, so it is
  deliberately omitted. Production would need a shared store (e.g. Redis) or an
  edge/WAF limit.
- **Browser-held challenge state is not authoritative.** It is re-validated
  server-side, but a determined client controls what it sends; the server owning
  the outcome is the real protection, not hiding the answer in the browser.
- **Prompt injection is mitigated, not solved** (§4).
- **localStorage is not encrypted** (§5).
- **No CSP** (§2).

---

## 8. Test coverage

| Suite | What it covers |
| --- | --- |
| **Unit (Vitest, 474)** | Chunking, retrieval, prompt building + injection containment, response validation, mastery/review policy, storage validation & migration, the reducer, the `processedActivityIds` cap, the shared HTTP reader, and the security-header config. |
| **Route-level (Vitest, in the 474)** | Each AI route: 415 / 413 / 400 / no-store / not-configured / GET-unsupported / validation / cancellation / timeout / safe provider-error mapping — with Gemini mocked. |
| **E2E (Playwright, 3)** | App smoke (workspace present, ≤1 canvas, security headers, no page error), grounded chat happy path (consent → single answer), and error recovery (safe error, input preserved, no fake answer). AI routes are intercepted with fixtures — **no real Gemini call.** |

**No automated test — unit, route, or E2E — calls the real Gemini API.** Route
tests mock the generation boundary via `vi.mock`; E2E tests intercept `/api/**`
with `page.route`.

### Running the tests

```bash
npm test          # Vitest unit + route tests
npm run test:e2e  # Playwright (starts the dev server, mocks AI)
npm run lint
npm run build
npm run verify    # test + lint + build (no E2E, to avoid a browser download in CI)
```

See `docs/release-checklist.md` for the full manual regression matrix
(responsive, keyboard, reduced-motion, WebGL fallback, console/network review)
and the minimal real-API smoke test.
