# Moti AI — Development Plan

A phased plan for building the Moti AI prototype. Each phase is small, reviewable,
and ends green (lint + production build pass). Feature dependencies are introduced
**only** in the phase that first uses them.

## Guiding rules

- Build only the current phase's scope. Do not pull future features forward.
- Every phase ends with clean `npm run lint` and `npm run build`.
- No secrets committed; AI calls are server-side only.
- No fabricated functionality — incomplete work is stated honestly.

---

## Phase 1 — Product foundation _(complete)_

**Goal:** establish the project, rules, documentation, and a minimal branded
scaffold.

**Deliverables**
- `CLAUDE.md` engineering rules.
- `docs/product-requirements.md`, `docs/research-findings.md`,
  `docs/architecture.md`, `docs/development-plan.md`.
- `README.md`.
- Next.js 16 app (App Router, TypeScript, Tailwind v4, ESLint, `src/`, `@/*`).
- Minimal branded landing page (name, tagline, description, Phase 1 status).
- `.gitignore`, `.env.example` (placeholders only).

**Dependencies:** none (starting point).

**Risks:** framework version drift (Next.js 16 differs from older docs);
scaffold placed in a nested folder by mistake.

**Validation:** `npm install`, `npm run lint`, `npm run build` all pass; landing
renders; no secret in the repo.

**Definition of done:** all deliverables present and coherent; lint and build
clean; no future-phase features present.

---

## Phase 2 — Static learning workspace & design system _(complete)_

**Goal:** build the production-quality static interface, design system, and
responsive product shell — visual and interaction only, driven by typed mock
data (no AI, upload, retrieval, persistence, or 3D).

**Deliverables**
- Responsive three-panel workspace (assistant, conversation, Mastery Journey)
  with tablet/mobile collapse and a mobile panel switcher.
- Brand design system in `globals.css` (palette, navy typography, subtle motion)
  plus reusable UI (mastery badges, inline SVG icons).
- Static conversation with the reusable Moti Mirror teach-back card, a
  learning-action toolbar, and a composer (local state, char count, disabled
  send).
- Mastery Journey and Memory Echo panels from typed mock data.
- Knowledge & settings drawer with open/close, tabs, Escape/backdrop close,
  focus handling, and body-scroll lock.

**New dependencies:** none.

**Dependencies:** Phase 1 foundation.

**Risks:** layout/overflow across breakpoints; scope creep into real features;
placeholders that could read as finished functionality.

**Validation:** lint + build clean; settings drawer opens and closes; no
horizontal overflow at desktop/tablet/mobile; no console errors; no forbidden
dependencies added.

**Definition of done:** the full workspace renders responsively as an honest
static prototype; every non-working feature is clearly labelled.

---

## Phase 3 — Knowledge ingestion & configuration _(complete)_

**Goal:** let a user configure the course and add learning material, persisted
locally in the browser.

**Deliverables (built)**
- Editable course configuration (title, learner level, objective, Moti
  instructions) with inline validation.
- Client-side document ingestion for **PDF, TXT, Markdown** — upload (click,
  drag-and-drop, keyboard) and paste — with validation, whitespace
  normalization, duplicate detection, and clear per-file success/error states.
- PDF text extraction via **PDF.js**, dynamically imported with a same-origin
  bundled worker; scanned/image-only PDFs rejected (no OCR).
- Knowledge management: document list with metadata, accessible plain-text
  preview dialog, and per-document removal (with confirmation + focus care).
- Typed, versioned `localStorage` persistence (`lib/storage`) with shape
  validation, safe fallback, save/reset, and saved/unsaved/saving/error states.
- Configuration state boundary (`CourseConfigurationContext` + hook); pure,
  React-free document utilities (`lib/documents`).

**New dependencies:** `pdfjs-dist` (only). Zero runtime sub-dependencies; used
client-side for PDF text extraction.

**Dependencies:** Phase 2 (workspace shell to wire ingestion into).

**Risks (addressed):** PDF extraction edge cases; hydration mismatch from
browser-only storage; localStorage failures. Scanned PDFs, malformed storage,
and write failures are all handled with clear messaging.

**Prototype limits:** 5 documents; 5 MB per file; 500,000 characters per
document; 1,000,000 characters total across all active documents (the sample
course counts toward the total).

**Validation:** each supported type extracted and persisted; unsupported /
oversized / empty / image-only inputs rejected clearly; per-document and total
character limits enforced with a clear "characters remaining" message; survives
reload; malformed storage falls back safely; reset restores the sample; no
`any`, no `dangerouslySetInnerHTML`, no network egress of content; lint + build
clean.

**Definition of done:** a user can configure Moti, add/preview/remove sources,
save, and reload with the configuration retained — all in the browser.

**Not in this phase:** documents are stored but **not yet used to answer
questions**; grounded AI arrives in Phase 4.

---

## Phase 4 — Knowledge chunking, indexing & retrieval _(complete)_

**Goal:** turn active documents into a searchable in-memory index and retrieve
the most relevant source sections for a question — deterministically, in the
browser, with no AI.

**Deliverables (built)**
- Section- and paragraph-aware chunking (`lib/chunking`) with Markdown-heading
  detection, overlap, stable ids, and per-document isolation.
- BM25-inspired in-memory index (`lib/retrieval`) with document-title,
  section-heading, exact-phrase, and query-coverage boosts (transparent,
  documented heuristic weights).
- Deterministic retrieval: validated/normalized query, ranked results with stable
  tie-breaking, top-4, and an honest "no relevant source" outcome.
- Grounding Lab settings tab: index stats, question input, result cards (rank,
  source, section, chunk, matched terms, excerpt, score breakdown, full-chunk
  preview), and all empty / error / no-match / no-searchable-terms states.
- Automated tests (Vitest) for chunking, tokenization, retrieval, and the sample
  queries; an `npm test` script.

**New dependencies:** `vitest` (**devDependency only**; test runner). No runtime
search / tokenization / chunking dependency.

**Dependencies:** Phase 3 (documents to index).

**Retrieval strategy:** lexical BM25-inspired ranking, chosen for transparency,
determinism, and zero runtime dependencies over the small local collection.
Embeddings + a vector database were intentionally **not** used (opaque,
non-deterministic, extra dependency); they are the documented upgrade path for
large corpora.

**Validation:** the four sample queries behave as expected; empty / stop-word /
over-long questions fail clearly; ranking is deterministic; the index rebuilds on
add / remove / reset; full-chunk preview works; no `any`, no
`dangerouslySetInnerHTML`, no runtime search dependency, no network egress; lint,
tests, and build all clean.

**Definition of done:** a user can test retrieval in the Grounding Lab and see the
exact source sections a grounded answer would use — with no AI connected.

**Not in this phase:** no answer generation; retrieved chunks are shown, not sent
to any model. Grounded generation is Phase 5.

---

## Phase 5 — Source-grounded conversation _(complete)_

**Goal:** grounded, multi-turn Q&A through a secure server Route Handler, with
local retrieval feeding remote generation.

**Deliverables (built)**
- `POST /api/chat` Node route handler; the API key stays server-side and is
  verified absent from the client bundle.
- Server AI layer (`lib/ai`): layered system instruction, prompt builder
  (delimited/escaped untrusted sources), JSON `responseSchema`, runtime response
  validation, source-id verification, and safe error mapping.
- Request validation + conversation utilities (`lib/chat`): bounded, untrusted
  input; ≤6 history; ≤4 sources; history/source mapping.
- Live conversation UI: `useMotiConversation` hook, functional composer
  (Enter-to-send, char count, cancel), learning actions, source previews,
  error + retry, API-status states.
- Privacy-boundary UX: persistent notice + per-session first-use acknowledgement.
- 45s server timeout + client-cancellable requests (`AbortController`).

**New dependencies:** `@google/genai` 2.12.0 (official Gemini SDK, server-side
only). No client AI SDK, no HTTP/form/state/streaming/retry libraries.

**Dependencies:** Phase 4 (local retrieval selects the source sections to ground on).

**Selected API path:** `ai.models.generateContent` (not the Interactions API,
which in this SDK is oriented toward stateful/agentic use out of scope here).
Model default/fallback `gemini-3.1-flash-lite` — confirmed working against the
real Gemini API for this project (it returns real grounded answers), overridable
via `GEMINI_MODEL`. During testing `gemini-3.5-flash` returned HTTP 503 for this
project.

**Validation:** 78 automated tests (no real API calls); grounded answers cite
only supplied source ids; insufficient-knowledge path returns no invented facts;
errors are categorised safely; no `any`, no `dangerouslySetInnerHTML`, no full
documents sent, no key in the client bundle; lint, tests, and build clean.

**Definition of done:** a learner holds a grounded conversation about their
material; Moti refuses to answer beyond the sources; retrieval remains local and
only excerpts are sent.

**Not in this phase:** Moti Mirror evaluation, quizzes, mastery updates, Memory
Echo scheduling, 3D — and conversation history is not persisted across reloads.

---

## Phase 6 — Interactive 3D Moti assistant _(complete)_

**Goal:** replace the static placeholder with a lightweight, procedurally
modelled 3D Moti that reacts to real conversation state. The signature 3D
assistant was brought forward (ahead of the teach-back loop) because Phase 5
already provides the states it needs to reflect (pending / error / new answer /
composing); the challenge-success `celebrating` state is implemented but reserved
for the later active-learning phase.

**Deliverables (built)**
- Procedural Moti character (`components/assistant/MotiCharacter` + `MotiFace` +
  `MotiStateEffects`) from Three.js primitives only — **no external model,
  texture, image, or animation asset**. Dark-navy core, warm ivory face, floating
  hands, soft platform, and a luminous learning-indicator ring.
- Six explicit visual states (`MotiVisualState`: idle / listening / thinking /
  explaining / celebrating / error) with per-state animation targets
  (`lib/avatar/animation-config`) interpolated with frame-rate-independent damping.
- **Client-only** React Three Fiber scene: one `<Canvas>` loaded via
  `next/dynamic` with `ssr: false` (`MotiAvatar` → `MotiCanvas`); no window/WebGL
  access during server rendering.
- Conversation → visual-state mapping (`lib/avatar/state-mapping`, priority
  thinking > error > explaining > listening > idle) driven by the real hook state,
  with a short self-clearing explaining window (`useMotiVisualState`).
- Accessibility: the WebGL scene is decorative; the current state is exposed as
  normal HTML (state label, description, and a polite live-region announcement).
- `prefers-reduced-motion` support (`useReducedMotion`, on-demand frame loop +
  static poses) and an on-brand 2D fallback (`MotiAvatarFallback`) behind an error
  boundary (`MotiAvatarErrorBoundary`) for absent/failed WebGL.
- Performance: capped DPR, low geometry, single Canvas, and a frame loop paused
  when offscreen (hidden mobile panel) or the tab is hidden.
- Automated tests (Vitest) for the pure state mapping and animation config.

**New dependencies:** `three` (0.185.1), `@react-three/fiber` (9.6.1) runtime;
`@types/three` (0.185.1) dev-only. No drei, no animation/physics/loader library,
no 3D asset.

**Dependencies:** Phase 5 (conversation state to reflect).

**Not in this phase:** the current concept remains a static label (not
AI-derived); `celebrating` is not yet triggered by app behaviour; no lip-sync,
voice, TTS, or external model loading.

**Definition of done:** Moti renders as a polished 3D character that changes to
Thinking during a request, Explaining after a successful answer, Error on failure,
Listening while composing, and Idle otherwise — with reduced-motion and WebGL
fallbacks, and no regression to lint / tests / build.

---

## Phase 7 — Moti Mirror teach-back _(complete)_

**Goal:** make the Moti Learning Loop real — the learner explains a concept in
their own words and receives structured, source-grounded coaching. This turns the
previously-disabled "Teach it back" action into a working feature.

**Deliverables (built)**
- **`POST /api/teach-back`** — a *separate* Node route handler (not a mode flag on
  `/api/chat`): teach-back has its own request, prompt, schema, and consistency
  rules, and deliberately sends **no conversation history**.
- Server teach-back layer (`lib/mirror`): bounded request validation, a layered
  system instruction (hard rules → rubric → subordinate configurable style →
  course context), delimited/escaped untrusted sources *and* learner explanation,
  a focused JSON `responseSchema`, runtime response validation with per-mode
  consistency enforcement, and source-id verification.
- Inline **Moti Mirror activity** (`components/mirror`) anchored to the grounded
  answer: teach-back composer (Ctrl/Cmd+Enter, never bare Enter), structured
  feedback (what you understood / what is missing / misconceptions / a clearer
  explanation / mastery recommendation + rationale / supporting sources /
  next action), and a Memory Echo preview.
- Pure activity state machine (`lib/mirror/mirror-state.ts`) + `useMotiMirror`:
  eligibility, concept derivation, loop stage, retry preserving the explanation,
  cancel, and close.
- The **learning loop and current concept in the AssistantPanel are now driven by
  the real activity** (Think → Explain → Correct → Remember), with one shared
  source of truth.
- 3D Moti reacts via `combineAvatarSignals`: pending → thinking, error → error,
  feedback → explaining, drafting → listening; a pending teach-back outranks
  idle/listening while normal chat still works. Geometry is unchanged.
- 94 new automated tests (**190 total**); none calls the real Gemini API.

**New dependencies:** none.

**Dependencies:** Phase 5 (grounded model access + validated sources).

**Evaluation rubric:** exploring / developing / understood / not-evaluated,
defined in `moti-mirror-system-instruction.ts` and documented in
`docs/architecture.md`. Conceptual understanding only — spelling, grammar, style,
and length are explicitly **not** criteria.

**Not in this phase:** no quizzes or challenges, **no Mastery Journey mutation**,
**no Memory Echo scheduling or persistence** (the recall prompt is a preview
only), no teach-back persistence, and `celebrating` is still not triggered.

**Definition of done:** a learner teaches a grounded concept back and receives
grounded coaching with a mastery *recommendation* and a recall prompt, while the
Mastery Journey and Memory Echo queue remain unchanged.

---

## Phase 8 — Adaptive micro-challenges _(complete)_

**Goal:** source-grounded practice pitched to the learner's level. This turns the
previously-disabled "Challenge me" action into a working activity.

**Deliverables (built)**
- **Two** Node route handlers — **`POST /api/challenge/generate`** and
  **`POST /api/challenge/evaluate`** — separate from each other and from
  `/api/chat` / `/api/teach-back`, because generation and marking have different
  requests, prompts, schemas, and validators. Neither sends conversation history.
- Four challenge types: `multiple-choice`, `scenario`, `correct-the-mistake`,
  `explain-in-own-words`, plus "Surprise me".
- **Deterministic marking for choice types** (no Gemini call — comparing option
  ids needs no model); **Gemini marking for free-response** conceptual answers.
- **Server-owned policy** (`lib/challenge/attempt-policy.ts`): mastery, next
  action, and answer reveal derived from `outcome + attemptNumber`. Max **2**
  attempts — a first failure earns a generated hint and a Retry; the second
  reveals the full grounded explanation and recommends the source.
- Difficulty (`beginner`/`intermediate`/`advanced`, default "Recommended" = the
  configured learner level) that shapes how the challenge is written, explicitly
  not a measure of ability.
- Inline challenge activity (`components/challenge`) with native `select`s, a
  semantic `fieldset`/`legend` + radio options, a free-response composer
  (Ctrl/Cmd+Enter, never bare Enter), and outcome shown by icon + text.
- **`celebrating` is now triggered** — only by a validated correct answer, for
  ~3s, and immediately overridden by a new request or an error. The 3D geometry is
  unchanged.
- Only one AI learning activity may run at a time: an open activity blocks the
  other rather than silently discarding work.
- 130 new automated tests (**320 total**); none calls the real Gemini API.

**New dependencies:** none.

**Dependencies:** Phase 5 (grounded model access + validated sources).

**Not in this phase:** **no Mastery Journey mutation**, **no Memory Echo scheduling
or persistence**, no challenge history, no long-term adaptive profile, no formal
grading or ability scores. Challenge state is in-memory only.

**Known limitation:** the answer key is held in client state between generation and
evaluation, so this is a learning prototype rather than a secure examination
platform. Documented in `docs/architecture.md`.

**Definition of done:** a learner generates a grounded challenge, answers it, gets
grounded feedback with a retry, and Moti celebrates a genuine correct answer —
while the Mastery Journey and Memory Echo queue remain unchanged.

---

## Phase 9 — Mastery Journey & Memory Echo (Remember)

**Goal:** track understanding and schedule review — the point at which Moti
Mirror's recommendation is allowed to *change* state.

**Deliverables**
- Concept status tracking: exploring / developing / understood (persisted),
  applying the Phase 7 mastery recommendation.
- Mastery Journey view driven by real state.
- Memory Echo review queue with spaced scheduling, consuming the Phase 7 recall
  prompts (which are preview-only until now).

**Dependencies:** Phases 3 & 7 (persistence + recommendations to apply).

**Risks:** scheduling logic complexity; keeping it simple and demonstrable.

**Validation:** concept status changes persist across reloads; review queue
populates and surfaces items; lint + build clean.

**Definition of done:** the Remember portion of the flow is demonstrable and
persists.

---

## Phase 10 — Polish, demo & deployment

**Goal:** a demonstrable, deployed prototype.

**Deliverables**
- Demo course loaded: "Responsible AI and Prompt Engineering Fundamentals".
- Brand/UX polish, accessibility pass, empty/error states.
- README finalised; Vercel deployment.
- End-to-end walkthrough of Think → Explain → Correct → Remember.

**Dependencies:** all prior phases.

**Risks:** deployment/env configuration; free-tier limits during a live demo.

**Validation:** full flow works on the deployed URL; lint + build clean; no
secret exposed.

**Definition of done:** a reviewer can run the full learning flow on the demo
course, locally and on Vercel.

---

## Cross-phase risks

- **Free-tier AI limits** may throttle demos — keep requests lean.
- **Framework drift (Next.js 16)** — verify APIs against bundled docs.
- **Scope creep** — the excluded features (auth, payments, LMS, cloud DB, etc.)
  stay excluded.
- **Grounding fidelity** — Phase 4 implements transparent lexical (BM25-inspired)
  retrieval. It has no synonym/semantic understanding; embedding-based search is
  the documented upgrade path for large corpora, not a current deliverable.
