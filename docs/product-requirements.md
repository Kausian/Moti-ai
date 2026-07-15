# Moti AI — Product Requirements

_Independent prototype for the Artin Solutions Stage 1 AI Product Prototype
Challenge. Not an official Artin Solutions product._

## Problem statement

Most learning tools are passive. Learners re-read PDFs, watch videos, and
highlight text, then feel productive while retaining little. General-purpose AI
chatbots do not fix this and often make it worse: they answer from broad world
knowledge instead of the learner's actual material, they hallucinate confident
but wrong details, and they hand over finished answers that let the learner skip
the thinking. The result is shallow understanding, misplaced confidence, and no
reliable signal of what has genuinely been mastered.

## Product vision

Moti AI is a source-grounded virtual learning coach that turns a learner's own
material into an active-learning experience. Moti does not just answer — it makes
the learner **think**, **explain** in their own words, **correct** misconceptions,
and **remember** through review. The experience is warm, encouraging, and
professional, anchored by a friendly 3D assistant named Moti.

Vision statement: _Learn actively. Understand deeply. Remember longer._

## Personas

### 1. Priya — the professional upskiller
Mid-career professional learning a new domain (e.g. Responsible AI) from PDFs and
articles her employer shared. Time-poor, motivated, wants to be sure she actually
understands rather than skims. Needs quick, trustworthy answers grounded in the
provided material and a way to check her own understanding.

### 2. Sam — the student
University student revising course readings before an assessment. Tends to
re-read and highlight. Needs to be pushed to explain concepts back and to find
the gaps in understanding before exam day.

### 3. Dana — the training provider
Prepares onboarding/compliance material for an organization. Wants learners to
engage actively with the exact approved source, not wander into ungrounded AI
answers. Needs confidence that the assistant stays within supplied content.

## User needs

- Upload my own material and learn from **that**, not the internet.
- Ask questions and get answers I can trust are grounded in my sources.
- Be prompted to explain things in my own words, not just be told the answer.
- Have my misunderstandings caught and gently corrected.
- Practice with small challenges pitched at my current level.
- See which concepts I am still exploring vs. have understood.
- Be reminded to review the right things at the right time.
- Feel encouraged and coached, not lectured at.

## Core user journey

1. **Configure** — the learner (or provider) sets Moti's assistant instructions
   and adds learning knowledge (uploads PDF / TXT / Markdown sources).
2. **Think** — the learner asks a question or is prompted with one; Moti responds
   grounded in the sources and invites the learner to reason first.
3. **Explain (Moti Mirror)** — the learner explains the concept back in their own
   words.
4. **Correct** — Moti detects misconceptions in the explanation and corrects them
   against the source, then offers an adaptive micro-challenge.
5. **Remember** — the concept is tracked in the Mastery Journey (exploring /
   developing / understood) and added to the Memory Echo review queue for later.

## Functional requirements

| ID | Requirement |
|----|-------------|
| FR-1 | Configure assistant instructions that shape Moti's persona and behaviour. |
| FR-2 | Configure the learning knowledge base (the grounded source set). |
| FR-3 | Ingest learning material from PDF, TXT, and Markdown and extract text. |
| FR-4 | Hold a conversation whose answers are grounded in the supplied sources. |
| FR-5 | When sources lack the answer, say so instead of inventing one. |
| FR-6 | Moti Mirror: prompt the learner to explain a concept in their own words. |
| FR-7 | Detect misconceptions in a learner's explanation and correct them. |
| FR-8 | Generate adaptive micro-challenges sized to the learner's current level. |
| FR-9 | Track each concept's status: exploring, developing, or understood. |
| FR-10 | Maintain a Memory Echo review queue of saved concepts. |
| FR-11 | Render an animated 3D assistant that reflects interaction state. |
| FR-12 | Persist prototype state locally in the browser (localStorage). |
| FR-13 | Route all AI calls through server-side handlers; never expose the key. |

## Non-functional requirements

- **Grounding & honesty:** answers stay within sources; uncertainty is stated.
- **Security:** API keys are server-only; uploaded content is treated as data,
  not instructions (prompt-injection resistant).
- **Privacy:** learner content stays local to the prototype except when sent to
  the AI provider to answer a request.
- **Performance:** landing and core interactions feel responsive on a laptop.
- **Accessibility:** readable contrast, keyboard-usable controls, honours
  `prefers-reduced-motion`.
- **Maintainability:** typed, small modules; clean lint and production build.
- **Portability:** deployable to Vercel free tier with only free/OSS tools.

## MVP acceptance criteria

- A learner can add source material and hold a conversation grounded in it.
- Moti declines to answer beyond the sources rather than hallucinating.
- The Think → Explain → Correct → Remember flow is demonstrable end-to-end.
- Concept status and the Memory Echo queue persist across page reloads.
- The 3D assistant renders and responds to interaction state.
- No secret is present in the client bundle.
- `npm run lint` and `npm run build` pass clean.

### Phase 1 acceptance criteria (this phase only)

- Next.js 16 + TypeScript + Tailwind v4 + ESLint app initialised in the repo root
  (App Router, `src/`, `@/*` alias), no nested duplicate project.
- Governance (`CLAUDE.md`) and docs (`product-requirements`, `research-findings`,
  `architecture`, `development-plan`) present and coherent.
- A minimal branded landing page showing name, tagline, description, and Phase 1
  status — no chat, AI, upload, avatar, or dashboard.
- `.gitignore` and `.env.example` (placeholders only) present; no secrets.
- `npm run lint` and `npm run build` pass clean.

## Out-of-scope features

Authentication, accounts, roles; payments/subscriptions; a full LMS; cloud
databases; certificates, leaderboards, gamification economies; complex analytics;
paid APIs or paid subscriptions; native mobile apps.

## Success criteria for the prototype

- Clearly communicates the product idea and the active-learning value.
- Demonstrates real, working grounded interaction (not a scripted mock).
- Shows sound research, product thinking, and architecture decisions.
- Is simple, focused, and demonstrable within the challenge's ~8-hour scope.
- Reflects a warm, human-centred brand suitable for an AI learning company.
