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

**Phase 3 — Local knowledge configuration & document ingestion (current).** The
settings drawer is now genuinely functional: you can configure the course, add
learning material, and everything persists locally in your browser.

What works in this phase:

- **Editable course configuration** — course title, learner level, learning
  objective, and Moti's instructions, with inline validation.
- **Document ingestion, entirely in the browser** — upload **PDF, TXT, and
  Markdown** (click, drag-and-drop, or keyboard), or paste text directly. Text
  is extracted, normalized, validated, and de-duplicated.
- **Knowledge management** — list documents with metadata, preview extracted
  text in an accessible dialog, and remove individual documents.
- **Local persistence** — save the configuration to `localStorage` under a
  versioned key; it survives a browser reload. Clear saved / unsaved / saving /
  saved / error states.
- **Reset sample course** — restore the original sample course and document.

### How your documents are handled

- **Everything is processed in your browser.** Documents are never uploaded to a
  server or any external service. PDF text is extracted client-side with
  [PDF.js](https://mozilla.github.io/pdf.js/).
- **Only extracted text and safe metadata are stored** — never the original
  files. Saved data lives in `localStorage`, local to **this browser profile on
  this device**.
- Extracted content is always rendered as **plain text** (never as HTML/Markdown
  and never with `dangerouslySetInnerHTML`), so document content cannot inject
  markup.

### Prototype limits (Moti AI safeguards, not browser limits)

- Up to **5 documents**, **5 MB per file**, **500,000 characters per document**,
  and **1,000,000 characters total** across all active documents (the sample
  course counts toward this total).

### Known limitations

- **No OCR.** Scanned or image-only PDFs contain no extractable text and are
  rejected with a clear message — try a text-based PDF or paste the text.
- Persistence is per-browser/per-device only; there is no cloud sync.

### Not connected yet (honest placeholders)

- **No AI, no Gemini, no retrieval.** Uploaded documents are stored and
  previewable but are **not yet used to answer questions** — the conversation
  panel still shows an illustrative Moti Mirror example. Grounded answers arrive
  in a later phase.
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
