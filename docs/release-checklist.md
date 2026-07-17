# Release Checklist — Moti AI

A repeatable gate to run before tagging a demo build or deploying. Nothing here
is destructive. Copy the boxes into a PR/checklist when doing a release pass.

> The automated portion is `npm run verify` plus `npm run test:e2e`. The manual
> portion below is a browser regression matrix that automation does not fully
> cover (visual, keyboard, reduced-motion, real-API smoke). **Do not copy any
> sensitive payload or secret into notes.**

---

## A. Automated gate

```bash
npm ci
npm run verify        # vitest (unit + route) → lint → production build
npm run test:e2e      # Playwright, AI routes mocked (no real Gemini)
```

- [ ] All unit + route tests pass (`npm test`).
- [ ] Playwright E2E passes (`npm run test:e2e`).
- [ ] No automated test calls the real Gemini API.
- [ ] Lint clean (`npm run lint`).
- [ ] Production build succeeds (`npm run build`).

### Dependency / supply-chain

```bash
npm ls @google/genai react react-dom three @react-three/fiber
npm audit --omit=dev
npm audit
npm outdated          # informational only
```

- [ ] Exactly one React, one Three.js, one React-Three-Fiber install (no dup tree).
- [ ] No unexpected AI SDK or analytics package present.
- [ ] Production `npm audit` reviewed; any finding is understood and justified,
      **not** force-fixed. *(Known: a moderate `postcss <8.5.10` advisory reaches
      us only transitively through Next's build tooling; the only "fix" is a
      breaking Next downgrade, so it is deferred, not applied. Build-time only.)*

---

## B. Security checks

- [ ] **Secret check:** the configured key is absent from `.next/static`
      (`grep -r` the key value → no match). Do **not** print the key.
- [ ] `git ls-files .env*` shows only `.env.example`; `.env.local` is ignored
      (`git check-ignore -v .env.local`).
- [ ] `.env.example` holds placeholders only.
- [ ] **API payload check (DevTools → Network):** each `/api/*` request carries
      only bounded fields — no full documents, no learning progress, no API key.
- [ ] Teach-back / challenge requests carry **no** normal chat history.
- [ ] Memory Echo practice sends **no** request.
- [ ] A deterministic (multiple-choice / scenario) answer makes **no** Gemini
      generation call.
- [ ] **Response headers:** `Cache-Control: no-store` on every `/api/*` response;
      `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`,
      `Permissions-Policy` present on document + API responses.
- [ ] **Body-size / content-type:** a non-JSON POST → 415; an oversized POST →
      413; malformed JSON → 400.
- [ ] **Source-ID check:** invented/duplicate source ids never appear in the UI.
- [ ] **Safe-error check:** no raw provider message, status, or stack reaches the UI.
- [ ] **Storage privacy:** no learner free text (explanations, answers, chat,
      excerpts) in `moti-ai:learning-progress:v1`.

---

## C. Product smoke (manual, local)

- [ ] Grounded chat: ask a question → grounded answer with a source chip; source
      preview shows exact plain text.
- [ ] "Sources don't cover this" path answers honestly rather than inventing.
- [ ] Moti Mirror: "Teach it back" is offered only on a grounded answer; submit an
      explanation → feedback; "Save to learning journey" works; the same result
      cannot save twice.
- [ ] Micro-challenge — all four types generate; a choice challenge shows exactly
      four radio options; correct → Correct + celebration; wrong → no celebration;
      two-attempt behaviour and reveal work.
- [ ] Mastery Journey: concept appears once; grouped Exploring/Developing/Understood.
- [ ] Memory Echo: item appears once; "I remembered" / "Needs more practice" /
      "Review tomorrow" behave; recall text is never persisted.
- [ ] Course ingestion: PDF/TXT/Markdown add; duplicates rejected; Grounding Lab
      retrieval returns relevant chunks.
- [ ] Reset learning progress does **not** reset course configuration.
- [ ] Reload: progress survives; saving twice is impossible.

---

## D. Quality regression (manual)

### Responsive (DevTools device toolbar)

- [ ] **~1280px+** — three panels; central conversation scrolls; Journey scrolls.
- [ ] **~768px** — layout holds; no hidden essential controls.
- [ ] **375px** — no horizontal overflow; mobile tab switching preserves state;
      challenge radios wrap; feedback cards wrap; long concept/source titles wrap;
      only one `<canvas>`.

### Keyboard & accessibility

- [ ] Full keyboard-only pass; visible focus throughout; no keyboard trap.
- [ ] Semantic headings; labelled textareas; native radios in a fieldset/legend.
- [ ] Dialogs (consent, source preview) trap focus, restore focus on close, and
      close on Escape.
- [ ] Outcome and mastery are conveyed by **text**, not colour/animation alone.
- [ ] `aria-live` announces the latest answer.

### Reduced motion (`prefers-reduced-motion: reduce`)

- [ ] No continuous decorative 3D movement; Moti's state still readable.
- [ ] Celebration is a static positive state; no confetti; no flashing.
- [ ] Dialogs and activities remain usable.

### WebGL

- [ ] With WebGL available: one Canvas, no context-loss errors.
- [ ] With WebGL blocked/unavailable: 2D fallback renders and does **not** block
      the conversation.

### Console & network

- [ ] No uncaught errors, React warnings, or hydration warnings on load and
      through a full flow.
- [ ] No failed resource requests; no external 3D model/texture request.

---

## E. Real-API smoke (minimal, uses quota)

Set a real `GEMINI_API_KEY` in `.env.local`, keep the model at
`gemini-3.1-flash-lite`, and run **one** of each:

- [ ] One grounded chat response (validated sources shown; no invented sources).
- [ ] One Moti Mirror evaluation.
- [ ] One generated **choice** challenge with deterministic marking (no AI call to mark).
- [ ] One generated **free-response** challenge marked by Gemini.
- [ ] One provider-error / unavailable-model simulation → safe error, input preserved.
- [ ] One cancelled request → no fake message, avatar exits Thinking.
- [ ] Model is still `gemini-3.1-flash-lite`; no raw provider error surfaced;
      progress stays local; chat still works after an error.

> Restore a valid key/model in `.env.local` afterwards; never commit it.

---

## F. Deployment readiness

- [ ] Environment variables documented (`.env.example`, README "Environment").
- [ ] Build works **without** a key; live AI requires a key only at runtime.
- [ ] No `localhost` URLs hard-coded; no temporary diagnostics or debug controls.
- [ ] No raw provider logging left in.
- [ ] README setup works from a clean clone.
- [ ] Playwright artifacts (`test-results/`, `playwright-report/`,
      `playwright/.cache/`) and browser binaries are git-ignored and uncommitted.
- [ ] Custom-model status is documented honestly: the submission uses the
      procedural Moti; no `public/models/moti.glb` is bundled and no remote
      model/texture URL is requested (verify one Canvas + no external 3D asset in
      the Network tab).
