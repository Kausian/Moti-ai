# Moti AI

**Learn actively. Understand deeply. Remember longer.**

Moti AI is a source-grounded virtual learning coach that helps learners move from
passively reading material to actively explaining, practising, and reviewing
concepts. Instead of answering from general knowledge, its assistant — **Moti** —
grounds every response in the learner's own uploaded material, asks them to explain
ideas back in their own words, corrects misconceptions against the source, and
schedules lightweight recall.

The whole experience is built around one signature loop:

**Think → Explain → Correct → Remember**

> **Live demo:** not yet deployed.
> **Demo video:** not yet available.
> **Repository:** https://github.com/Kausian/Moti-ai

---

## Overview

A learner works through Moti AI in a single, coherent flow:

1. **Configure a course** — set a title, learning objective, learner level, and the
   instructions that shape how Moti coaches.
2. **Add source material** — upload or paste PDF, TXT, or Markdown. Documents are
   processed entirely in the browser.
3. **Ask grounded questions** — Moti answers from selected excerpts of the material
   and says so honestly when the sources don't cover a question.
4. **Review the sources** — every grounded answer exposes the exact plain-text
   excerpts it was built from.
5. **Practise actively** — teach a concept back through **Moti Mirror**, or take a
   source-grounded **micro-challenge**.
6. **Save validated outcomes** — nothing is recorded automatically; the learner
   chooses what to keep.
7. **Track and review** — saved work builds a **Mastery Journey**, and a local
   **Memory Echo** queue brings concepts back for spaced recall.

---

## Key Features

### Source-grounded learning
- PDF, TXT, and Markdown ingestion with in-browser text extraction.
- Deterministic local chunking and a lexical (BM25-inspired) retrieval index.
- Answers grounded in selected source excerpts, with an honest
  "the sources don't cover this" response when appropriate.
- Plain-text source previews attached to each grounded answer.
- A **Grounding Lab** that lets the learner inspect retrieval transparently.

### Active learning
- **Moti Mirror** teach-back — explain a concept in your own words and receive
  structured, source-grounded feedback.
- The full **Think → Explain → Correct → Remember** loop drives the interaction.
- Four micro-challenge types: **multiple-choice**, **scenario**,
  **correct-the-mistake**, and **explain-in-your-own-words**.
- Two-attempt feedback: a first miss earns a targeted hint and a retry; the second
  reveals the full grounded explanation.

### Progress and review
- Explicit **"Save to learning journey"** — results are kept only on the learner's
  action.
- Mastery recommendations grouped as **Exploring / Developing / Understood**.
- A **Needs Review** flag instead of punishing a single weaker attempt.
- Local, versioned persistence with multi-course isolation.
- A **Memory Echo** recall queue with learner-controlled review decisions
  (I remembered / Needs more practice / Review tomorrow).

### Experience and reliability
- An interactive, procedurally-modelled **3D Moti** assistant with distinct visual
  states.
- A responsive three-panel workspace (assistant · conversation · journey).
- Reduced-motion support and a 2D fallback when WebGL is unavailable.
- Safe error mapping, request cancellation, and a calm app-level error boundary.
- Accessibility-focused controls: semantic headings, labelled inputs, native radio
  groups, visible focus, and status conveyed in text (never colour alone).

---

## Research Process & Findings

### Product and learning research
Passive study tends to produce shallow, short-lived understanding. Moti AI is built
around better-established practices: **retrieval practice**, **teach-back** (explaining
a concept aloud to expose hidden gaps), **immediate grounded feedback**, and **spaced
review**. One product choice follows directly: mastery is an understandable
**recommendation** rather than a fabricated score, because a prototype cannot honestly
certify learning outcomes.

### AI grounding research
A generic chatbot is a poor coach — it answers from general knowledge and can invent
facts beyond the material. Moti AI treats grounding as a system property: documents are
chunked locally and searched with a transparent lexical index, only a few **selected
excerpts** reach the model, returned source IDs are **re-validated** against what was
supplied, and every response is validated as **structured JSON**. Chat, teach-back, and
challenges each use their own contract rather than one overloaded endpoint.

### Privacy and reliability research
Because uploaded material can be sensitive, documents are processed in the browser and
the full collection is never transmitted — only the minimal data needed for a task
reaches the model, and only minimal metadata is stored locally. Request bodies are
bounded and validated, provider errors are mapped to safe public messages, and baseline
security headers are applied, while the honest limits are documented rather than hidden.

### Key findings
- **Grounding requires validation *after* generation.** Structured output is not
  trustworthy simply because it is JSON — fields, lengths, and source IDs must be
  re-checked server-side.
- **Active learning needs different interaction contracts from chat.** Teach-back and
  challenges deliberately send no conversation history and carry their own schemas.
- **Mastery should be a recommendation, not a formal score.** Presenting confident
  percentages would misrepresent what a prototype can measure.
- **One weak result should not erase stronger evidence.** A later shaky attempt flags
  *Needs Review* rather than downgrading a concept.
- **Transparent limitations increase credibility.** Naming what is *not* protected is
  more trustworthy than implying guarantees.

More detail: [`docs/research-findings.md`](docs/research-findings.md).

---

## Design & Architecture

Moti AI is a single Next.js (App Router) application. The browser owns ingestion,
retrieval, the UI, and local persistence; the server owns the API key, the model, and
grounding assembly. All AI traffic flows through Route Handlers — the browser never
calls Gemini directly and never sees the key.

```mermaid
flowchart LR
    A[Course documents] --> B[Browser-side extraction]
    B --> C[Chunking and lexical index]
    D[Learner question] --> E[Local retrieval]
    C --> E
    E --> F[Validated source excerpts]
    F --> G[Next.js AI Route Handler]
    G --> H[Gemini]
    H --> I[Structured response validation]
    I --> J[Grounded learning UI]
    J --> K[Moti Mirror or Micro-Challenge]
    K --> L[Save validated outcome]
    L --> M[Local Mastery Journey and Memory Echo]
```

### Architectural boundaries
Four server Route Handlers, each with its own validator and structured schema:

| Route | Responsibility |
| --- | --- |
| `POST /api/chat` | Grounded conversation over selected excerpts. |
| `POST /api/teach-back` | Moti Mirror evaluation of a learner explanation. |
| `POST /api/challenge/generate` | Writes one source-grounded challenge. |
| `POST /api/challenge/evaluate` | Marks a challenge answer. |

They are kept **separate on purpose**. Each has a distinct request shape, prompt,
response schema, and consistency rules — teach-back and challenges send no
conversation history and require at least one validated source, and free-response
marking differs from deterministic choice marking. Overloading a single endpoint with
mode flags would couple unrelated contracts and weaken every validator. Each route runs
on the Node runtime, is uncached, reads its body through one shared bounded reader, and
returns `Cache-Control: no-store` with safe public error payloads.

### Data flows
1. **Grounded chat** — the browser retrieves excerpts locally, sends the question,
   recent history, course settings, and up to four excerpts to `/api/chat`; the server
   builds the grounded prompt, calls Gemini, validates the structured answer (including
   re-checking cited source IDs), and returns it.
2. **Moti Mirror** — the learner's explanation plus the selected answer's excerpts go
   to `/api/teach-back` (no chat history); the server returns structured feedback and a
   mastery recommendation. The recommendation does not mutate saved progress on its own.
3. **Micro-challenges** — `/api/challenge/generate` produces one grounded challenge;
   `/api/challenge/evaluate` marks it. Choice challenges are marked deterministically on
   the server without any model call; free-response answers are marked by Gemini against
   the reference answer and essential points.
4. **Learning-progress persistence** — when the learner chooses **Save to learning
   journey**, a validated outcome is written to versioned local storage as a pure,
   idempotent state transition. This data is never sent to Gemini or any Route Handler.

More detail: [`docs/architecture.md`](docs/architecture.md).

---

## Design Decisions

**Local-first document processing.** Documents are parsed in the browser so complete
uploaded files are never sent to Gemini — only selected excerpts leave the device.

**Lexical retrieval before embeddings.** Deterministic lexical retrieval was chosen for
prototype transparency, predictability, zero external cost, and easy inspection.
Embeddings are a documented upgrade path, not a current dependency.

**Selected excerpts only.** A small, capped set of validated excerpts is sent per
request rather than whole documents.

**Separate AI contracts.** Chat, teach-back, challenge generation, and free-response
evaluation use independent request/response contracts and schemas.

**Structured outputs plus runtime validation.** Model output is validated field by
field and never trusted simply because it is JSON; invented or duplicate source IDs are
removed before anything reaches the UI.

**Intentional progress saving.** Nothing is recorded automatically — results are saved
only when the learner selects "Save to learning journey", and saving is idempotent.

**Conservative mastery policy.** Stronger evidence can raise a concept's mastery, while
a single weaker result sets **Needs Review** instead of downgrading it.

**Local, privacy-minimised persistence.** Only concept metadata, source-label
snapshots, timestamps, and review prompts are stored — never chat history, learner
explanations, written challenge answers, or full AI feedback.

**Choice challenge evaluation without AI.** Multiple-choice and scenario answers are
marked deterministically on the server; comparing two option IDs needs no model.

**Procedural 3D assistant.** The submission uses a lightweight procedurally-modelled
character with a 2D fallback. A custom GLB model was intentionally deferred so
visual-asset work would not delay the functional prototype; the architecture supports a
later drop-in with a GLB → procedural → 2D fallback chain.

**Honest prototype security.** The public endpoints are unauthenticated, there is no
durable global rate limiter, browser-held challenge state is not secure enough for
formal exams, localStorage is readable by any same-origin script and is not encrypted,
and prompt-injection defence is a mitigation rather than a guarantee.

---

## Implementation Process

The prototype was built as a layered workflow rather than a single pass. Work started
by fixing the product boundaries and the core learning loop, then building the
responsive workspace and the local course-configuration system. Local ingestion,
deterministic chunking, and lexical retrieval were implemented and tested in isolation
before any model was involved, so grounding could be reasoned about independently of
the AI.

Grounded conversation was then added through a server Route Handler with structured
output and runtime validation, followed by teach-back and micro-challenges as
**separate** workflows with their own contracts. Validated outcomes were connected to
local progress and review only after those activities were stable, keeping persistence
pure and idempotent. The interactive avatar and its accessible fallbacks were layered
on without becoming load-bearing — essential information always lives in the HTML, not
the canvas. The final stages hardened request handling, added unit, route, and browser
regression tests, and completed a responsive and accessibility polish pass.

A few engineering practices were held throughout: **small, focused modules**;
**pure, deterministic policy functions** with injected time; **strict TypeScript** with
no implicit `any`; **server-only secrets**; **dependency restraint**; **no real Gemini
calls in automated tests** (the model boundary is mocked and browser tests intercept
every API route); a small set of **manual real-provider smoke tests**; and **explicit
documentation of limitations**.

---

## Technologies & Platforms Used

| Technology / Platform | Purpose |
| --- | --- |
| Next.js (App Router) | Frontend framework and server Route Handlers. |
| React | UI rendering and component model. |
| TypeScript | Static typing across the codebase. |
| Tailwind CSS | Styling via CSS-based configuration and design tokens. |
| Google Gemini API (`@google/genai`) | Server-side grounded generation and evaluation. |
| Three.js + React Three Fiber | The procedural 3D Moti assistant. |
| pdfjs-dist | Client-side PDF text extraction. |
| Vitest | Unit and Route Handler tests (Gemini mocked). |
| Playwright | Focused browser end-to-end tests (AI routes intercepted). |
| ESLint | Linting via a flat config. |
| Browser localStorage | Local, versioned persistence of course config and progress. |
| Vercel | Intended deployment target — the Route Handlers are Vercel-compatible; not currently deployed. |
| Git & GitHub | Version control and repository hosting. |

**Core versions:** Next.js `16.2.10` · React `19.2.4` · Three.js `0.185.1` ·
React Three Fiber `9.6.1` · `@google/genai` `^2.12.0` · pdfjs-dist `^6.1.200` ·
Vitest `^4.1.10` · Playwright `^1.61.1` · Tailwind CSS `^4` · TypeScript `^5`.

The default model is **`gemini-3.1-flash-lite`** (configurable via `GEMINI_MODEL`).

---

## Project Structure

```
src/
├── app/
│   └── api/          # Route Handlers: chat, teach-back, challenge/generate, challenge/evaluate
├── components/       # Workspace, chat, mirror, challenge, learning, settings, assistant, ui
├── contexts/         # Course configuration and learning-progress providers
├── hooks/            # Conversation, mirror, challenge, visual-state, reduced-motion hooks
├── lib/
│   ├── ai/           # Server-only Gemini client, prompt building, response validation
│   ├── chat/         # Chat request validation and conversation history
│   ├── challenge/    # Challenge generation/evaluation contracts and policy
│   ├── chunking/     # Deterministic document chunking
│   ├── http/         # Shared bounded JSON reader, safe responses, security headers
│   ├── mirror/       # Moti Mirror teach-back contract
│   ├── progress/     # Pure mastery/review policy and versioned storage
│   └── retrieval/    # Lexical index and scoring
└── data/             # Sample course and demo data

tests/
└── e2e/              # Playwright specs (AI routes mocked with fixtures)

docs/                 # Product requirements, research, architecture, testing & security
```

---

## Setup Instructions

### Prerequisites
- **Git**
- **Node.js 20 LTS or newer** (the project targets the Node 20 type definitions, and
  Next.js 16 requires a current LTS)
- **npm** (bundled with Node.js)
- A **Google Gemini API key** for live AI features
- A modern browser with **WebGL** for the 3D assistant (a 2D fallback renders otherwise)

### Clone
```bash
git clone https://github.com/Kausian/Moti-ai.git
cd Moti-ai
```

### Install
```bash
npm install
```
For a clean, reproducible install (e.g. in CI), use `npm ci`.

### Configure environment
Copy the template and add your key:
```bash
cp .env.example .env.local
```
`.env.local`:
```bash
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-3.1-flash-lite
```
- The key is **server-only** — never prefix it with `NEXT_PUBLIC_`.
- `.env.local` is ignored by Git; only `.env.example` (placeholders) is committed.
- The app **builds and runs without a key**; live AI requests require one, and the
  conversation reports that AI is not configured until it is set.

### Run the development server
```bash
npm run dev
```
Open http://localhost:3000.

### Production build
```bash
npm run build
npm start
```

### Testing and verification
```bash
npm test          # Vitest unit + Route Handler tests (no real Gemini call)
npm run lint      # ESLint
npm run build     # Production build
npm run verify    # test + lint + build in one command
npm run test:e2e  # Playwright end-to-end tests (AI routes mocked)
```
On a fresh clone, install the Playwright browser once before running E2E:
```bash
npx playwright install chromium
```

---

## How to Use

1. Open **Settings**.
2. Configure the course title, objective, and learner level.
3. Upload or paste **PDF, TXT, or Markdown** source material.
4. Ask Moti a grounded question about the material.
5. Review the supporting **sources** attached to the answer.
6. Choose **Teach it back** or **Challenge me** to practise.
7. **Save** a validated result to your learning journey.
8. Return later to practise **Memory Echo** reviews.

---

## Testing & Quality Assurance

Quality is enforced by an automated suite that never contacts the real model:

- **481** Vitest unit and Route Handler tests
- **9** Playwright end-to-end tests
- Lint clean; production build succeeds

The Route Handler tests mock the Gemini boundary; the Playwright tests intercept every
`/api/**` call with deterministic fixtures. Coverage areas include:

- request and structured model-response validation;
- local chunking and lexical retrieval;
- prompt boundaries and source-ID verification;
- challenge evaluation and the two-attempt policy;
- the mastery and review policy (pure, time-injected);
- storage corruption and write-failure handling;
- request-size (413) and content-type (415) handling;
- keyboard navigation and responsive flows;
- reduced-motion behaviour and the one-Canvas rule.

This is meaningful regression coverage, not a claim of exhaustive or 100% coverage.
See [`docs/testing-and-security.md`](docs/testing-and-security.md) and
[`docs/release-checklist.md`](docs/release-checklist.md).

---

## Privacy, Security & Responsible Use

**What the design protects**
- Full uploaded documents stay in the browser; only selected excerpts may be sent to
  Gemini.
- Learner explanations are sent only for the relevant teach-back evaluation, without
  conversation history.
- Learning progress is stored **locally** and is never sent to Gemini or any Route
  Handler.
- Learner free-text explanations and written challenge answers are **not** stored in
  progress.
- The API key stays **server-only**; API responses are `Cache-Control: no-store`.
- Request size and content type are validated (415 / 413 / 400); cited source IDs are
  re-verified; all model output is rendered as plain text.

**Honest limitations**
- The public prototype endpoints are **unauthenticated**.
- There is **no durable global rate limiting**.
- **localStorage is not encrypted** and is readable by any same-origin script.
- **Prompt-injection defence is a mitigation, not a guarantee.**
- Moti AI is **not** a secure formal-examination system.
- Mastery statuses are **learning recommendations**, not certified assessments.

---

## Current Limitations

- Lexical retrieval rather than semantic embeddings.
- Local-only progress with no cloud synchronisation.
- No authentication.
- No teacher or multi-user dashboard.
- A procedural avatar rather than a custom production character.
- No voice input, text-to-speech, or lip-sync.
- No secure exam sessions.
- No formal educational validation.
- No concept-relationship visualisation — it was intentionally excluded from the
  submission scope.

---

## Future Improvements

- A custom, optimised GLB Moti character (dropping into the existing fallback chain).
- Optional embeddings or hybrid lexical + semantic retrieval.
- Authenticated cloud synchronisation of progress.
- Teacher-authoring and analytics tools.
- Protected challenge sessions for higher-stakes practice.
- More advanced review scheduling.
- Optional speech features.
- Production rate limiting and monitoring.
- A stricter nonce-based Content-Security-Policy.

---

## Screenshots

_Screenshot assets are not yet included in the repository._ Recommended views to
capture before submission (replace this note with the images when ready):

- Main learning workspace
- Grounded answer with sources
- Moti Mirror teach-back feedback
- A micro-challenge
- Mastery Journey and Memory Echo
- Settings and document ingestion
- Mobile view

---

## Demo

- **Repository:** https://github.com/Kausian/Moti-ai
- **Live prototype:** not yet deployed.
- **Demo video:** not yet available.

---

## Documentation

- [Product requirements](docs/product-requirements.md)
- [Research findings](docs/research-findings.md)
- [Architecture](docs/architecture.md)
- [Testing & security](docs/testing-and-security.md)
- [Release checklist](docs/release-checklist.md)

---

## Author

**Kausian Senthan**
GitHub: [@Kausian](https://github.com/Kausian)

---

## Challenge context

Moti AI is an **independent prototype** built for the Artin Solutions Stage 1 AI Product
Prototype Challenge, using only free and open-source tools. It is **not** an official
Artin Solutions product and does not use its branding — it is inspired only by the
company's public focus on AI-powered learning. As a prototype, it is not production-ready.
