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

**Phase 4 — Transparent knowledge retrieval & Grounding Lab (current).** Moti now
turns your documents into a searchable, in-memory index and can retrieve the
most relevant source sections for a question — all locally, and all before any AI
is involved.

What works in this phase:

- **Section-aware chunking** — documents are split at Markdown headings
  (`#`/`##`/`###`) and paragraph boundaries into overlapping chunks (~900 target,
  1,200 hard max, ~120 overlap), preserving heading metadata and exact offsets.
- **In-memory lexical index** — a **BM25-inspired** term index built from the
  active documents, with document-title, section-heading, exact-phrase, and
  query-coverage boosts. Weights are transparent prototype heuristics, not a
  scientifically tuned configuration.
- **Grounding Lab** (a settings tab) — ask a question and see the exact source
  sections Moti would ground on: rank, document, section, chunk, matched terms, a
  plain-text excerpt, a full **Retrieval score** breakdown, and a full-chunk
  preview. It clearly reports when nothing relevant is found.
- **Automated tests** (Vitest) — chunking, tokenization, retrieval ranking, and
  the sample-course queries are covered by `npm test`.
- Everything from Phase 3 (configuration, PDF/TXT/Markdown ingestion, previews,
  removal, reset, versioned `localStorage` persistence) still works.

### How retrieval works (and what it is not)

- **Lexical, not semantic.** Retrieval matches words, not meaning — there are **no
  embeddings and no vector database**. This keeps it transparent, deterministic,
  dependency-free, and instant on the small local collection.
- **Derived, never persisted.** The index and chunks are rebuilt from the stored
  documents whenever the document set changes; only the documents themselves live
  in `localStorage`.
- **In-browser only.** No query or document is ever sent over the network.
- The **Retrieval score** is an internal ranking value, never labelled as an "AI
  confidence" score.

### Prototype limits (Moti AI safeguards, not browser limits)

- Up to **5 documents**, **5 MB per file**, **500,000 characters per document**,
  and **1,000,000 characters total** across all active documents (the sample
  course counts toward this total). Retrieval questions are capped at **300
  characters**.

### Known limitations

- **No OCR.** Scanned or image-only PDFs contain no extractable text and are
  rejected with a clear message.
- Lexical retrieval has no synonym or concept understanding (no stemming): a
  question must share actual words with the source to match. This is adequate for
  the small prototype collection; large corpora would want embedding-based search.
- Persistence is per-browser/per-device only; there is no cloud sync.

### Not connected yet (honest placeholders)

- **No AI answers.** Retrieval selects the source sections a grounded answer
  *would* use, but **no LLM is connected** — the conversation panel still shows an
  illustrative Moti Mirror example. Grounded generation arrives in the next phase.
- The 3D assistant remains a styled placeholder (React Three Fiber / Three.js
  come later).

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
