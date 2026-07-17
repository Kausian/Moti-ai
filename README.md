# Moti AI

**Learn actively. Understand deeply. Remember longer.**

Moti AI is a source-grounded virtual learning coach. Its assistant, **Moti**,
turns your own course material into an active-learning experience built around a
simple loop: **Think → Explain → Correct → Remember**. Instead of handing over
answers, Moti grounds every response in your uploaded sources, asks you to
explain concepts back in your own words, corrects misconceptions, and helps you
remember through spaced review — with a friendly animated 3D assistant alongside.

## Planned key features

- **Configurable assistant instructions** — shape Moti's persona and behaviour.
- **Configurable learning knowledge** — supply the grounded source set.
- **PDF, TXT & Markdown input** — learn from your own material.
- **Source-grounded conversation** — answers stay within your sources, and Moti
  says so when they don't cover a question.
- **Moti Mirror** — teach-back: explain a concept in your own words.
- **Misconception detection & correction** — gaps caught and fixed against source.
- **Adaptive micro-challenges** — practice pitched to your current level.
- **Mastery Journey** — track concepts as exploring, developing, or understood.
- **Memory Echo** — a spaced review queue for what you've learned.
- **Animated 3D assistant** — Moti reacts to the interaction.

## Planned technology stack

- **Next.js (App Router, v16)** + **React** + **TypeScript**
- **Tailwind CSS v4** (CSS-based config)
- **Next.js Route Handlers** for all server logic
- **Google Gemini API** (free tier), called **server-side only**
- **React Three Fiber + Three.js** for the 3D assistant
- **PDF.js** for client-side PDF text extraction
- **Browser localStorage** for prototype persistence
- **Vercel** for deployment

> Feature-specific dependencies (React Three Fiber, Three.js, PDF.js, Gemini)
> are added in the phase that first uses them, not before.

## Development status

**Phase 6 — interactive 3D Moti assistant (current).** The static placeholder is
replaced by a lightweight, **procedurally modelled** 3D Moti (React Three Fiber +
Three.js) that reacts to real conversation state.

What works in this phase:

- **A polished 3D character** built entirely from Three.js primitives — **no
  external model, texture, image, or animation asset** is loaded.
- **Six visual states** (`idle / listening / thinking / explaining / celebrating /
  error`) driven by real conversation behaviour: **Thinking** while Gemini
  processes, **Explaining** briefly after a successful answer, **Error** after a
  failure, **Listening** while you compose, **Idle** otherwise. (`celebrating` is
  implemented but reserved for a later challenge-success phase.)
- **Client-only rendering** — one `<Canvas>` loaded via `next/dynamic` with
  `ssr: false`; nothing touches WebGL during server rendering and the build needs
  no browser.
- **Accessibility** — the WebGL scene is decorative; Moti's state is exposed as
  normal HTML (label, description, polite live-region announcement).
- **Reduced motion** — `prefers-reduced-motion` holds static, state-distinct poses
  and pauses continuous animation; state is never conveyed by motion alone.
- **Graceful fallback** — an on-brand 2D Moti (behind an error boundary + WebGL
  check) covers absent/failed WebGL; the conversation keeps working.
- **Lightweight** — capped DPR, low geometry, a single Canvas, and a frame loop
  paused when the avatar is offscreen or the tab is hidden.
- **Automated tests** — the pure conversation→state mapping and animation config
  are unit-tested (Vitest, **96 total**); no test creates a WebGL context.
- Everything from Phases 3–5 (configuration, ingestion, retrieval, Grounding Lab,
  and the real Gemini conversation) still works.

> Known limitation: the 3D scene needs a normally-rendering browser with a working
> `ResizeObserver`; some automated/headless preview tools throttle it and won't
> initialize the scene, but real browsers render it. The current concept shown in
> the panel is still a static label (not AI-derived) in this phase.

<details>
<summary><strong>Phase 5 — Gemini-grounded conversation (complete)</strong></summary>

The conversation panel is live: ask a question, Moti retrieves the relevant source
sections **locally**, then a secure server route sends only those excerpts to
**Google Gemini** and returns a structured, source-grounded answer.

What works in this phase:

- **Real multi-turn conversation** — grounded answers with the sources actually
  used shown as chips (click to preview the exact excerpt sent to Gemini).
- **Local retrieval, remote generation** — the Phase 4 lexical engine still picks
  the top ≤4 chunks in the browser; only those excerpts (plus the question,
  recent history, and course config) are sent. **Your full documents are never
  sent.**
- **Learning actions** — "Explain simply" and "Give an example" send grounded
  follow-ups; "Show source" opens a local preview (no extra API call); "Ask a
  follow-up" focuses the composer.
- **Honest failure modes** — insufficient-knowledge answers when the material
  doesn't cover a question; clear, categorised errors (not configured / auth /
  rate limit / timeout / safety / malformed / provider) with a Retry for
  retryable ones; **Cancel** an in-flight request.
- **Privacy transparency** — a persistent notice plus a per-session first-use
  acknowledgement before the first AI request.
- **Automated tests** (Vitest, **78 total**) — request validation, prompt
  construction, response validation, error mapping, conversation utilities, and
  prompt-injection cases. **No test calls the real API.**
- Everything from Phases 3–4 (configuration, ingestion, previews, persistence,
  and the fully-local Grounding Lab) still works.

</details>

### AI configuration

- SDK: **`@google/genai` 2.12.0**, server-side only, via `ai.models.generateContent`
  with a structured `responseSchema`.
- Model: read from **`GEMINI_MODEL`**; server-side fallback
  **`gemini-3.1-flash-lite`** — the confirmed default, verified working against the
  real Gemini API for this project and returning real grounded answers. (During
  testing, `gemini-3.5-flash` returned HTTP 503 for this project; the model stays
  configurable via `GEMINI_MODEL`.)
- The **`GEMINI_API_KEY`** lives only in server env (`.env.local`), never uses a
  `NEXT_PUBLIC_` prefix, and is absent from the client bundle. The app builds and
  runs without it; the conversation reports *"AI conversation is not configured"*
  until one is set.

### Privacy boundary (changed in Phase 5)

Phases 3–4 were fully local. Now, **when you send a message**, your question,
recent conversation, and up to four relevant source excerpts are sent to the
configured Gemini API. Your full document collection is **not** sent, documents
stay in this browser, and the conversation is not persisted by Moti AI.
Provider-side handling follows the configured Gemini account and terms.

### Grounding & prompt-injection defence

- Answers to course-specific questions come **only** from the supplied excerpts;
  Moti says so when the material is insufficient rather than inventing facts.
- Source text is delimited and escaped as **untrusted data**; hard-coded system
  rules always precede the user-configurable coaching style; the model may only
  cite source ids that were supplied, and returned ids are re-validated.
- Prompt injection cannot be eliminated entirely — this is a prototype defence,
  not a guarantee.

### Prototype limits & security notes

- Request caps: message **300 chars**, history **6 items**, sources **4** (≤1,500
  chars each, ≤6,000 total). Server timeout **45s**.
- The `POST /api/chat` endpoint is public and unauthenticated; a production
  deployment would need server-side rate limiting and auth. No third-party
  rate-limiter is added in this phase.

### Not connected yet (later phases)

- **No** Moti Mirror teach-back evaluation, quizzes, mastery updates, or Memory
  Echo scheduling. The 3D Moti assistant is **live** (Phase 6) but its
  `celebrating` state is not yet triggered by app behaviour, and the concept it
  shows is a static label. Conversation history is **not** persisted across reloads.

See [`docs/development-plan.md`](docs/development-plan.md) for the full phase plan.

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Validation used to close each phase:

```bash
npm run lint
npm run build
```

### Environment

Copy `.env.example` to `.env.local` and fill in real values when AI features are
added (a later phase). Phase 3 needs no environment variables — all document
processing and persistence happen in the browser. The future AI key is
**server-only** and must never be committed or exposed to the browser.

## Documentation

- [`CLAUDE.md`](CLAUDE.md) — engineering rules and guardrails
- [`docs/product-requirements.md`](docs/product-requirements.md)
- [`docs/research-findings.md`](docs/research-findings.md)
- [`docs/architecture.md`](docs/architecture.md)
- [`docs/development-plan.md`](docs/development-plan.md)

## Challenge context

Built for the **Artin Solutions Stage 1 AI Product Prototype Challenge**
(estimated ~8 hours of effort). The challenge evaluates research, product
thinking, architecture, engineering decisions, implementation quality,
documentation, and working functionality. It uses only free and open-source
tools; no paid subscriptions or paid APIs.

## Disclaimer

Moti AI is an **independent challenge prototype** created for the Artin Solutions
Stage 1 challenge. It is **not** an official Artin Solutions product and does not
copy Artin Solutions' branding, logo, or website. It is inspired only by the
company's public focus on AI-powered learning.
