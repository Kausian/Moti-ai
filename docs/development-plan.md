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

## Phase 5 — Source-grounded conversation

**Goal:** grounded Q&A through a server Route Handler.

**Deliverables**
- `/api/chat` Route Handler calling Gemini server-side.
- Grounding/prompt-assembly module (`lib/grounding`) that injects source context
  and enforces "answer only from sources; else say so".
- Prompt-injection defence: uploaded content treated as data, not instructions.
- Chat UI wired to the handler.
- `.env.local` usage documented; key server-only.

**New dependencies:** Gemini access (server-side); no client SDK.

**Dependencies:** Phase 4 (retrieval selects the source sections to ground on).

**Risks:** hallucination/off-source drift; key leakage; free-tier rate limits.

**Validation:** grounded answers cite/stay within sources; out-of-source
questions are declined; no key in client bundle; lint + build clean.

**Definition of done:** a user can hold a grounded conversation about their
material, and Moti refuses to answer beyond the sources.

---

## Phase 6 — Active-learning loop (Think → Explain → Correct)

**Goal:** the teach-back and correction pedagogy.

**Deliverables**
- Moti Mirror teach-back interaction (learner explains in their own words).
- `/api/evaluate` handler for misconception detection + correction against source.
- Adaptive micro-challenges sized to the learner's level.

**Dependencies:** Phase 5 (grounded model access).

**Risks:** misconception detection is best-effort; challenge difficulty
calibration; keeping feedback encouraging, not discouraging.

**Validation:** an explanation with a known misconception is caught and
corrected; a micro-challenge is generated; lint + build clean.

**Definition of done:** the Think → Explain → Correct portion of the flow works
end-to-end on the demo course.

---

## Phase 7 — Mastery Journey & Memory Echo (Remember)

**Goal:** track understanding and schedule review.

**Deliverables**
- Concept status tracking: exploring / developing / understood (persisted).
- Mastery Journey view.
- Memory Echo review queue with spaced scheduling (prototype-level).

**Dependencies:** Phases 3 & 6 (persistence + concepts to track).

**Risks:** scheduling logic complexity; keeping it simple and demonstrable.

**Validation:** concept status changes persist across reloads; review queue
populates and surfaces items; lint + build clean.

**Definition of done:** the Remember portion of the flow is demonstrable and
persists.

---

## Phase 8 — Animated 3D assistant (Moti)

**Goal:** the signature 3D assistant.

**Deliverables**
- React Three Fiber + Three.js assistant that reflects interaction state
  (idle / thinking / speaking / encouraging).
- Integration into the learning UI.
- `prefers-reduced-motion` and graceful fallback when WebGL is unavailable.

**New dependencies:** React Three Fiber, Three.js (introduced here).

**Dependencies:** core learning flow (Phases 5–7) so the avatar has states to
reflect.

**Risks:** bundle weight; WebGL support/performance on weaker devices.

**Validation:** avatar renders, animates, reflects state; reduced-motion honoured;
lint + build clean.

**Definition of done:** Moti is present and meaningfully reactive without
regressing performance or the build.

---

## Phase 9 — Polish, demo & deployment

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
