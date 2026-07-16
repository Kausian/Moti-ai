# Moti AI — Research Findings

_This document records the problem selection and reasoning behind Moti AI. It is
deliberately qualitative. No numerical statistics are invented; where a claim
would need data we do not have, it is labelled as an **assumption**._

## The selected problem

**Passive learning produces shallow, short-lived understanding, and generic AI
chatbots make it worse by answering from general knowledge, encouraging
copy-paste answers, and hallucinating beyond the material.**

Moti AI reframes the AI assistant from an "answer machine" into a **learning
coach** that grounds itself in the learner's own material and drives active
recall and self-explanation.

## Why this fits an AI-powered learning company

- It is squarely in the domain of **AI-powered learning**: using generative AI to
  improve how people learn, not merely to retrieve information.
- It is **source-grounded**, which is exactly the capability organizations need
  when they want learners to engage with approved, specific material (training,
  compliance, courseware) rather than the open internet.
- It demonstrates **product thinking beyond a chatbot**: a structured pedagogy
  (Think → Explain → Correct → Remember) layered on top of the model.
- It is **demonstrable and self-contained** with free tools, fitting a prototype
  challenge while still showing a credible path to a real product.

## User pain points

- "The AI just gives me the answer, so I never actually learn it."
- "I can't tell if the chatbot is right or making things up."
- "It answers from general knowledge, not from my course material."
- "I re-read and highlight for hours and still can't explain the concept."
- "I don't know what I actually understand versus what I only recognise."
- "I learn something, then forget it a week later with no prompt to review."
- Training providers: "I need learners to stay inside the material we approved."

_(These are representative qualitative pain points drawn from well-known
learning-science themes and common experience, not from a measured study.)_

## Active-learning principles used by Moti

Moti's design draws on established, widely taught learning-science ideas:

- **Active recall / retrieval practice** — retrieving an idea strengthens memory
  far more than re-reading it. Moti asks the learner to produce answers.
- **Self-explanation** — explaining a concept in one's own words exposes gaps and
  deepens understanding. This is the Moti Mirror (teach-back) interaction.
- **The generation effect** — learners remember material they generate better
  than material they passively receive.
- **Immediate, targeted feedback** — misconceptions corrected promptly, against
  the source, prevent them from consolidating.
- **Desirable difficulty** — challenges pitched slightly beyond current comfort
  (adaptive micro-challenges) improve durable learning.
- **Spaced repetition** — revisiting material over spaced intervals improves
  long-term retention. This is Memory Echo.
- **Metacognition** — making the learner's mastery visible (exploring /
  developing / understood) helps them direct their own effort.

These principles are qualitative and directional; Moti operationalises them, it
does not claim measured effect sizes.

## Risks of building a generic chatbot

- **Hallucination:** an ungrounded model invents facts, undermining trust in a
  learning context where correctness matters.
- **Passive answer-delivery:** if Moti just answers, it reproduces the exact
  passive-learning problem we set out to solve.
- **No learning signal:** a plain chatbot cannot tell the learner what they have
  mastered, so it cannot coach.
- **Off-source drift:** for training/compliance use, wandering outside the
  approved material is a real product risk.
- **Undifferentiated product:** "another chatbot wrapper" shows little product
  thinking; the pedagogy and grounding are the differentiators.

Moti mitigates these with source grounding, an explicit refuse-when-unsupported
rule, the teach-back loop, and visible mastery tracking.

## Considered technical options

- **Framework:** Next.js App Router vs. a separate SPA + standalone API.
- **AI provider:** Google Gemini free tier vs. other hosted LLMs vs. local models.
- **AI call location:** server-side Route Handlers vs. direct client calls.
- **Grounding approach (prototype):** whole-source / lightweight context assembly
  vs. a full vector-database RAG pipeline.
- **PDF extraction:** client-side PDF.js vs. a server-side parsing service.
- **Persistence:** browser localStorage vs. a hosted/cloud database.
- **3D assistant:** React Three Fiber + Three.js vs. 2D animation (e.g. Lottie).

## Decision table

| Decision | Chosen | Alternatives | Why |
|----------|--------|--------------|-----|
| Framework | Next.js App Router (v16) | SPA + separate API | One codebase for UI + server routes; easy Vercel deploy; keeps secrets server-side. |
| AI provider | Google Gemini (free tier) | Other hosted LLMs; local models | Free, capable, simple server API; fits "no paid APIs". |
| AI call location | Server Route Handlers | Direct client calls | Keeps API key off the client; enables grounding + injection defence server-side. |
| Retrieval (prototype) | Client-side lexical, BM25-inspired ranking | Embeddings + vector DB | Transparent, deterministic, and dependency-free over a small local set; you can see *why* a chunk matched. Embeddings are the upgrade path for large corpora. |
| PDF extraction | PDF.js (client) | Server parsing service | Free, no extra backend; keeps files on the client until needed. |
| Persistence | Browser localStorage | Cloud database | Challenge excludes cloud DB; localStorage is enough to demo state across reloads. |
| 3D assistant | React Three Fiber + Three.js | 2D/Lottie | Delivers the "meaningful 3D assistant" differentiator with a mainstream React stack. |
| Styling | Tailwind CSS v4 | CSS Modules; UI kit | Fast, consistent, token-driven brand system; no heavy dependency. |

## Gemini SDK and API-path decision (Phase 5)

- **SDK:** the current official JavaScript SDK is **`@google/genai`** (installed
  `2.12.0`), **not** the deprecated `@google/generative-ai`. Node engine `>=20`
  (satisfied by Node 24). It is used **only** server-side.
- **API path:** the SDK exposes both `ai.models.generateContent` and a newer
  `ai.interactions` API. We chose **`generateContent`**. Reason: in this SDK
  version the Interactions API is oriented toward stateful/agentic use (agents,
  triggers, tools, MCP, Google Search) — all explicitly out of scope for this
  phase — while `generateContent` provides the cleanest, best-typed structured
  JSON flow (`responseMimeType` + `responseSchema`), `systemInstruction`,
  `abortSignal`, and safety/`finishReason` fields for a stateless single-turn
  grounded request with client-managed history. One path only.
- **Model:** confirmed default/fallback `gemini-3.1-flash-lite`, overridable via
  `GEMINI_MODEL`. It was verified working against the real Gemini API for this
  project and returns real grounded answers. `gemini-3.5-flash` was tried first
  but returned HTTP 503 for this project, so the confirmed default was switched to
  `gemini-3.1-flash-lite`.
- **Grounding stays local:** retrieval runs in the browser; only the selected
  excerpts are sent. Gemini does not perform document retrieval.

## Assumptions

- **A1:** Gemini's free tier is sufficient for prototype-level usage and demo.
- **A2:** For the demo course, source material is modest in size, so lightweight
  context assembly is adequate without a vector database.
- **A3:** Learners run the prototype on a desktop/laptop browser capable of WebGL
  for the 3D assistant.
- **A4:** localStorage persistence per-browser is acceptable for a prototype;
  no cross-device sync is expected.
- **A5:** The demo course "Responsible AI and Prompt Engineering Fundamentals"
  is representative enough to showcase the full learning flow.
- **A6:** Evaluators value demonstrated grounded interaction and product thinking
  over breadth of half-finished features.

## Limitations

- No formal user study underlies these findings; they are reasoned from
  established learning-science principles and common experience.
- Prototype grounding is lightweight, not a production retrieval system; very
  large source sets are out of scope for this phase.
- Retrieval is lexical (BM25-inspired), so it matches words, not meaning: there is
  no synonym expansion or stemming. A question must share actual terms with the
  source. This is adequate for the small prototype collection; embedding-based
  semantic search would be needed for large or vocabulary-diverse corpora.
- localStorage means no multi-device or multi-user persistence.
- Misconception detection is model-driven and best-effort, not guaranteed.
- Free-tier AI limits (rate/quotas) may constrain heavy demo usage.
- Prompt-injection defences (hard rules before configuration, delimited/escaped
  untrusted sources, source-id re-validation) reduce but cannot eliminate the
  risk; this is a prototype, not a hardened system.
- The `POST /api/chat` endpoint is public and unauthenticated in this prototype;
  production would require server-side rate limiting and authentication.
- Conversation history is in-memory only and not persisted across reloads.
- The 3D assistant requires WebGL and is not optimised for low-end/mobile devices.
