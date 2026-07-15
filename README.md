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

**Phase 2 — Static learning workspace & design system (current).** The app now
renders the full responsive learning workspace as a polished, static interface
driven entirely by typed mock data.

What works in this phase:

- Responsive three-panel workspace — assistant, learning conversation, and
  Mastery Journey — that collapses cleanly to tablet and mobile layouts.
- A branded design system (warm gradient palette, navy typography, reusable
  mastery-status badges, inline SVG icons, subtle motion).
- An open/close **Knowledge & settings** drawer with tabs, form fields, Escape
  and backdrop close, focus handling, and body-scroll lock.
- Mobile panel switching, a message composer with live character count and a
  disabled send state, and a static Moti Mirror teach-back example.

Intentionally **not** connected yet (visually honest placeholders only):

- No AI, no Gemini calls, no retrieval — all conversation content is mock data.
- No real file upload or PDF/TXT/Markdown parsing; the drop zone is illustrative.
- No persistence (no localStorage/database); edits in the settings drawer are
  in-memory only.
- The 3D assistant is a styled placeholder; React Three Fiber / Three.js arrive
  in a later phase.

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
added (Phase 3). The AI key is **server-only** and must never be committed or
exposed to the browser.

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
