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

**Phase 8 — adaptive micro-challenges (current).** Pick a grounded answer, choose
**"Challenge me"**, and Moti sets a focused practice task built only from that
answer's sources — then marks your response and celebrates a genuine win.

What works in this phase:

- **Four challenge types** — multiple choice, scenario, correct the mistake, and
  explain in your own words. Or pick **Surprise me** and let Moti choose.
- **Difficulty** — Recommended (your configured level), Beginner, Intermediate, or
  Advanced. It shapes how the challenge is *written*; it is not a measure of your
  ability, and the UI says so.
- **Marking that fits the question** — multiple-choice and scenario answers are
  marked **deterministically on the server with no AI call** (comparing two option
  ids needs no model); free-text answers are marked by Gemini against the reference
  answer, essential points, and sources.
- **Two attempts, with a real hint** — a first wrong answer earns a targeted nudge
  and a Retry *without* revealing the answer; the second reveals the full grounded
  explanation and points you at the source. You can reveal the answer early, but
  that ends the challenge without a win.
- **Moti celebrates** — the `celebrating` state is finally earned, and **only** by a
  validated correct answer. A new request or an error interrupts it immediately; a
  wrong answer never celebrates.
- **Honest boundaries** — *"This recommendation has not yet changed your Mastery
  Journey"* and *"This review prompt is not saved or scheduled yet."* Neither the
  Mastery Journey nor the Memory Echo queue is mutated.
- **Automated tests** (Vitest, **320 total**) — request and challenge validation,
  prompt layering and injection containment, the deterministic marking rules, the
  attempt policy, the activity state machine, and celebrating-state combination.
  **No test calls the real API.**

> Limitations: this is a **learning prototype, not a secure exam**. The answer key
> is held in client state between generating and marking, so a technically
> knowledgeable learner could inspect it — real assessment would need server-side
> challenge sessions. There is no grading, score, or ability measurement, and
> challenge results are in-memory only.

<details>
<summary><strong>Phase 7 — Moti Mirror teach-back (complete)</strong></summary>

The learning loop is real: **Think → Explain → Correct → Remember**. Pick a
grounded answer, choose **"Teach it back"**, explain the concept in your own words,
and Moti coaches your explanation against *only* that answer's sources.

- **A real teach-back activity** — inline, anchored to the answer it belongs to.
  Moti asks you to explain the concept; you write it in your own words.
- **Structured, source-grounded coaching** — what you understood, what is missing,
  misconceptions (your idea paraphrased + the correction), a clearer explanation,
  a mastery recommendation with its rationale, the supporting sources, a
  recommended next action, and one Memory Echo recall prompt.
- **A documented rubric** — exploring / developing / understood / not-evaluated.
  Moti judges **conceptual understanding only**: spelling, grammar, style, and
  length are explicitly not criteria, so a short accurate explanation can be
  *understood* and a long fluent but wrong one is not.
- **A separate `POST /api/teach-back`** — its own request, rubric prompt, schema,
  and validation. It sends **no conversation history** and requires **at least one
  validated source**, so an explanation is never evaluated ungrounded.
- **Honest boundaries** — the recommendation is labelled *"a prototype learning
  recommendation [that] has not yet changed your Mastery Journey"*, and the recall
  prompt is labelled *"not scheduled or saved yet"*. Neither the Mastery Journey
  nor the Memory Echo queue is mutated.
- **Real failure handling** — categorised errors with **Retry** that preserves your
  explanation, **Cancel** for an in-flight evaluation, and never a fabricated
  feedback card.
- **The loop drives the UI** — the AssistantPanel's stage and current concept
  follow the real activity, and 3D Moti reacts (thinking while evaluating,
  explaining on feedback, error on failure, listening while you write).
- **Automated tests** (Vitest, **190 total**) — request validation, prompt layering
  and injection containment, response validation and per-mode consistency, the
  activity state machine, and avatar-state combination. **No test calls the real API.**

> Limitations: the mastery result is a **recommendation only** — it is not a formal
> or certified assessment, produces no scores or percentages, and changes no
> tracked state. Teach-back results are in-memory only. Adaptive challenges are
> Phase 8; applying mastery and scheduling review are Phase 9.

<details>
<summary><strong>Phase 6 — interactive 3D Moti assistant (complete)</strong></summary>

The static placeholder is replaced by a lightweight, **procedurally modelled** 3D
Moti (React Three Fiber + Three.js) that reacts to real conversation state.

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
</details>
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

### Privacy boundary (changed in Phase 5, extended in Phases 7–8)

When you take a challenge, the selected concept, your challenge response, your
course configuration, and up to four supporting source excerpts may be sent to the
configured Gemini API — again **without** your conversation history. Multiple-choice
and scenario answers are marked deterministically on the server and are **not** sent
to Gemini at all.


Phases 3–4 were fully local. Now, **when you send a message**, your question,
recent conversation, and up to four relevant source excerpts are sent to the
configured Gemini API. **When you teach a concept back**, the concept, your
explanation, your course configuration, and that answer's source excerpts (≤4) are
sent — **without** your conversation history. Your full document collection is
**never** sent, documents stay in this browser, and neither the conversation nor
your teach-back feedback is persisted by Moti AI. Provider-side handling follows
the configured Gemini account and terms.

### Grounding & prompt-injection defence

- Answers to course-specific questions come **only** from the supplied excerpts;
  Moti says so when the material is insufficient rather than inventing facts.
- Source text is delimited and escaped as **untrusted data**; hard-coded system
  rules always precede the user-configurable coaching style; the model may only
  cite source ids that were supplied, and returned ids are re-validated.
- Prompt injection cannot be eliminated entirely — this is a prototype defence,
  not a guarantee.

### Prototype limits & security notes

- Chat request caps: message **300 chars**, history **6 items**, sources **4**
  (≤1,500 chars each, ≤6,000 total). Server timeout **45s**.
- Teach-back caps: concept **150 chars**, explanation **15–1,200 chars**, sources
  **1–4** (same size caps, and **no** history). Same **45s** timeout.
- Challenge caps: concept **150 chars**, written answer **5–1,200 chars**, sources
  **1–4**, **2 attempts** per challenge, exactly **4** options for choice types.
  Same **45s** timeout.
- The `POST /api/chat`, `POST /api/teach-back`, and both `POST /api/challenge/*`
  endpoints are public and unauthenticated; a production deployment would need
  authentication, server-side rate limiting, protected assessment state, and secure
  challenge sessions. None are added in this prototype.

### Not connected yet (later phases)

- **No** Mastery Journey updates and **no** Memory Echo scheduling (Phase 9). Moti
  Mirror and micro-challenges produce a mastery *recommendation* and a recall
  *preview* only; neither changes tracked state.
- Conversation history, teach-back feedback, and challenge results are **not**
  persisted across reloads, and there is no challenge history.

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
