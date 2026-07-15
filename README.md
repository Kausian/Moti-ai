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

**Phase 1 — Product foundation (current).** This repository currently contains
the project rules, documentation, and a minimal branded scaffold. The dashboard,
chat, grounded AI, knowledge upload, learning flow, and 3D assistant are planned
for later phases. See [`docs/development-plan.md`](docs/development-plan.md).

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
