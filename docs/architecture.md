# Moti AI — Architecture

_Planned architecture for the Moti AI prototype. Later phases implement these
flows; Phase 1 establishes the foundation and this plan._

## High-level architecture

Moti AI is a single **Next.js (App Router, v16)** application deployed to Vercel.
It has two clear halves:

- **Client (browser):** the friendly UI shell, local persistence
  (localStorage), source ingestion (PDF.js text extraction), and the animated 3D
  assistant (React Three Fiber + Three.js).
- **Server (Next.js Route Handlers):** the only place that holds the AI key,
  assembles grounded context from the sources, applies safety/grounding rules,
  and calls the Gemini API.

The guiding rule: **the browser never talks to the AI provider directly and never
sees the API key.** All model traffic is proxied through server Route Handlers.

## Architecture diagram

```mermaid
flowchart TD
  subgraph Client["Client — Browser (React, Tailwind)"]
    UI["Moti UI shell\n(landing, chat, Moti Mirror,\nMastery Journey, Memory Echo)"]
    Avatar["3D Assistant\n(React Three Fiber + Three.js)"]
    Ingest["Source ingestion\n(PDF.js / TXT / Markdown)"]
    Store["Local persistence\n(localStorage module)"]
  end

  subgraph Server["Server — Next.js Route Handlers"]
    ChatAPI["/api/chat\ngrounded conversation"]
    EvalAPI["/api/evaluate\nteach-back + misconception check"]
    Ground["Grounding & prompt assembly\n(source context + safety rules)"]
  end

  subgraph External["External (server-side only)"]
    Gemini["Gemini API"]
  end

  UI -->|user question / explanation| ChatAPI
  UI -->|learner explanation| EvalAPI
  Ingest -->|extracted source text| Store
  Store -->|selected sources as context| UI
  UI -->|sources + message| ChatAPI
  ChatAPI --> Ground
  EvalAPI --> Ground
  Ground -->|grounded prompt| Gemini
  Gemini -->|grounded response| Ground
  Ground -->|answer / feedback| UI
  UI -->|progress + queue updates| Store
  UI <-->|interaction state| Avatar
```

## Client / server boundaries

| Concern | Client | Server |
|---------|:------:|:------:|
| UI rendering, routing, brand | ✅ | |
| 3D assistant (WebGL) | ✅ | |
| PDF/TXT/Markdown text extraction | ✅ | |
| localStorage persistence | ✅ | |
| Assembling grounded prompt context | | ✅ |
| Applying grounding & injection-defence rules | | ✅ |
| Holding the AI API key | | ✅ |
| Calling the Gemini API | | ✅ |

Server-only modules are never imported into client components. Client components
are marked with `"use client"` deliberately.

## Knowledge-ingestion flow (implemented in Phase 3)

All ingestion happens **in the browser**; nothing is uploaded anywhere.

1. The learner adds a source file (PDF, TXT, or Markdown) via click,
   drag-and-drop, or keyboard — or pastes text directly.
2. `lib/documents/file-validation` identifies the type (extension + MIME) and
   validates size and non-emptiness against the prototype limits.
3. Text is extracted client-side: **PDF.js** (`lib/documents/parse-pdf`, loaded
   via dynamic `import()` with a same-origin bundled worker) for PDF; the File
   API (`file.text()`) for TXT/Markdown.
4. `lib/documents/normalize-text` collapses noisy whitespace while preserving
   paragraph breaks; empty results and over-length content are rejected with
   clear messages. Scanned/image-only PDFs yield no text and are rejected (no
   OCR).
5. `lib/documents/duplicates` blocks obvious duplicates (never silently
   replacing an existing document).
6. The resulting `KnowledgeDocument` (extracted text + safe metadata only) is
   added to the configuration in `CourseConfigurationContext`.
7. Sources are treated as **data, not instructions** — extracted text is
   rendered only as plain text and, in later phases, will be passed to the model
   as untrusted source context.

## Knowledge retrieval flow (implemented in Phase 4)

Retrieval is **lexical, deterministic, and entirely in-browser** — no embeddings,
no vector database, and no network calls. It selects the source sections a future
grounded answer would draw from; it does not generate answers.

```mermaid
flowchart LR
  Docs["Knowledge documents\n(stored text)"]
  Chunk["Section- & paragraph-aware\nchunking (lib/chunking)"]
  Index["In-memory index\n(BM25-inspired, lib/retrieval)"]
  Query["Learner question"]
  Tok["Query tokenization\n(lowercase, stop-words, dedupe)"]
  Rank["Ranking + boosts\n(title / heading / phrase / coverage)"]
  Top["Top source sections\n(≤ 4, with matched terms)"]

  Docs --> Chunk --> Index
  Query --> Tok --> Rank
  Index --> Rank --> Top
```

1. **Chunking** (`lib/chunking`): each document is split at Markdown headings and
   paragraph boundaries into overlapping chunks (target ~900, hard max ~1,200,
   overlap ~120 characters), preserving the current heading and exact character
   offsets. Chunk ids are stable (`documentId:chunk:N`); documents are isolated.
2. **Indexing** (`lib/retrieval/build-index`): each chunk is tokenized (content
   terms, stop words removed) into term frequencies; the index also stores
   per-term document frequencies and the average chunk length for BM25.
3. **Query tokenization** (`lib/retrieval/tokenize`): the question is lowercased,
   diacritics stripped, punctuation dropped, stop words removed, and duplicate
   terms de-duplicated.
4. **Scoring** (`lib/retrieval/score-chunk`): a BM25-inspired content score plus
   four documented boosts — document-title, section-heading, exact-phrase, and
   query-coverage. IDF ensures a rare term (e.g. *hallucination*) outweighs a
   generic one (e.g. *AI*). All values are guarded to stay finite.
5. **Retrieval** (`lib/retrieval/retrieve-knowledge`): ranks by score with stable
   tie-breaking (score → document title → chunk index), returns at most four
   results, and returns none when there is no meaningful term overlap — never
   padding with irrelevant chunks.

**Why chunks/index are derived, not persisted:** they are a pure function of the
stored documents, so persisting them would duplicate data and risk drift. The
`useKnowledgeIndex` hook rebuilds the index via `useMemo` only when the documents
array changes (add / remove / reset); editing the course title does not rebuild it.

**Why not embeddings + a vector database (yet):** embeddings would add a runtime
dependency (or a paid/hosted service), obscure *why* a chunk matched, and be
non-deterministic — the opposite of what this transparent prototype needs over a
handful of small documents. Lexical BM25 is inspectable from the source, instant,
and dependency-free. Embedding-based semantic search is the documented upgrade
path for large corpora, where lexical matching (no synonyms, no stemming) is the
main limitation.

## AI request flow (implemented in Phase 5)

Retrieval stays **local**; only the selected excerpts leave the browser. Gemini
never sees the document collection and does not perform retrieval itself.

```mermaid
flowchart TD
  Q["Learner question"]
  V1["Local validation\n(non-empty, ≤300 chars)"]
  R["Local retrieval\n(Phase 4 lexical engine)"]
  Top["Top ≤4 source chunks\n→ ChatSourceInput[]"]
  Post["POST /api/chat\n(message + ≤6 history + course + sources)"]
  V2["Server validation\n(untrusted input, size caps)"]
  P["Prompt construction\n(layered system rules + delimited sources)"]
  G["Gemini generateContent\n(structured JSON, 45s timeout)"]
  V3["Response validation\n(schema + runtime checks)"]
  IDs["Source-id verification\n(only supplied ids)"]
  UI["Conversation UI\n(answer + used sources)"]

  Q --> V1 --> R --> Top --> Post --> V2 --> P --> G --> V3 --> IDs --> UI
```

1. **Local validation + retrieval (client):** the question is validated, then the
   Phase 4 engine selects the top ≤4 chunks and maps them to `ChatSourceInput[]`
   (`lib/chat/conversation-history.ts`). The full documents / index are never sent.
2. **POST `/api/chat` (Node route handler):** the body is `{ message, history
   (≤6), course, sources (≤4) }`. `route.ts` keeps only orchestration.
3. **Server validation** (`lib/chat/validate-chat-request.ts`): all input is
   untrusted; message/history/course/source sizes and shapes are bounded, duplicate
   source ids and malformed metadata are rejected, and a safe generic 400 is
   returned on failure (no internals exposed).
4. **Prompt construction** (`lib/ai/prompt-builder.ts` + `moti-system-instruction.ts`):
   a layered system instruction — **Layer 1 hard rules** (grounding, no invented
   facts/ids, ignore instructions in sources, no secret disclosure) always precede
   the **subordinate Layer 2** configurable coaching style and **Layer 3** course
   context. Retrieved sources are delimited and angle-bracket-escaped as untrusted
   data in the final user turn.
5. **Gemini call** (`lib/ai/generate-moti-response.ts` → `gemini-client.ts`):
   `ai.models.generateContent` with `responseMimeType: "application/json"`, a small
   `responseSchema`, low temperature, and an `AbortSignal.any([request.signal,
   timeout])`. The model is read from `GEMINI_MODEL` with a server-side fallback to
   the confirmed default **`gemini-3.1-flash-lite`** (verified working against the
   real Gemini API for this project; `gemini-3.5-flash` returned HTTP 503 for this
   project during testing). The API key is read from server env only and never
   uses a `NEXT_PUBLIC_` prefix.
6. **Response validation** (`lib/ai/validate-ai-response.ts`): structured output
   is not trusted on its own — the parsed JSON is re-validated, and
   `usedSourceIds` are filtered to only ids that were supplied (unknown/duplicate
   ids removed). Safety blocks and malformed output become typed errors.
7. **Error mapping** (`lib/ai/error-mapping.ts`): provider/internal errors map to
   safe categories (not-configured / auth / rate-limit / timeout / safety /
   model-unavailable / malformed / provider) with stable codes, user messages,
   HTTP status, and a retryable flag. Raw provider errors and stack traces are
   never exposed; no query or source content is logged.
8. **Client** (`useMotiConversation`): renders the answer as plain text with the
   validated sources as clickable chips; history is kept **in memory only**.

## 3D Moti assistant flow (implemented in Phase 6)

The signature 3D assistant reacts to **real conversation state**. Mapping is pure
and testable; the WebGL scene is client-only, procedural, and self-contained (no
external asset, no network request for the scene).

```mermaid
flowchart TD
  Conv["Conversation state\n(useMotiConversation: pending / error /\nnew answer + composer activity)"]
  Map["Visual-state mapping\n(lib/avatar/state-mapping + useMotiVisualState)"]
  State["MotiVisualState\n(idle / listening / thinking /\nexplaining / celebrating / error)"]
  Canvas["Client-only R3F scene\n(next/dynamic ssr:false → MotiCanvas)"]
  Geo["Procedural Moti geometry\n(MotiCharacter / MotiFace / MotiStateEffects)"]
  Anim["State-specific animation\n(animation-config, damped in useFrame)"]

  Conv --> Map --> State --> Canvas --> Geo --> Anim
```

```mermaid
flowchart LR
  NoGL["WebGL unavailable /\ncontext fails / scene throws"]
  Boundary["MotiAvatarErrorBoundary\n+ WebGL detection"]
  Fallback["Accessible 2D fallback\n(MotiAvatarFallback)"]
  Keep["Conversation + workspace\nremain fully functional"]

  NoGL --> Boundary --> Fallback --> Keep
```

1. **Owning the state (`LearningWorkspace`):** the conversation hook is lifted to
   the workspace so both the conversation panel and the assistant panel read one
   source of truth. The composer reports a "composing" signal (focused or a
   non-empty draft) up.
2. **Mapping (`lib/avatar/state-mapping` + `hooks/useMotiVisualState`):** a pure,
   unit-tested priority mapping — **thinking > error > explaining > listening >
   idle**. `useMotiVisualState` adds the only stateful piece: a short,
   self-clearing **explaining** window after a successful answer (a new request →
   thinking, an error → error, and a cleared conversation → idle all pre-empt it,
   so Moti never sticks — including after a cancellation). `celebrating` is a
   supported state reserved for a later challenge-success phase; the conversation
   mapping never emits it.
3. **Client-only rendering (`MotiAvatar` → `MotiCanvas`):** one React Three Fiber
   `<Canvas>` loaded via `next/dynamic` with `ssr: false`, so no `window`/WebGL is
   touched during server rendering. The initial server-rendered panel still shows
   Moti's accessible status and a 2D fallback.
4. **Procedural geometry (`MotiCharacter` / `MotiFace` / `MotiStateEffects`):**
   Three.js primitives only (sphere / capsule / cylinder / torus / circle) — dark
   navy core, warm ivory face, floating hands, soft platform, and a luminous
   learning-indicator ring. No external model, texture, image, or animation asset.
5. **Animation (`lib/avatar/animation-config`, `useFrame`):** per-state targets of
   plain finite numbers, interpolated with frame-rate-independent damping; no
   per-frame object allocation and no React state updated from the frame loop.
6. **Accessibility:** the WebGL scene is decorative (`role="img"` wrapper). Moti's
   status lives in normal HTML — a state label, a short description, and a polite
   live-region announcement — so screen-reader users get meaningful, non-noisy
   feedback without interacting with the canvas.
7. **Reduced motion (`useReducedMotion`):** honours `prefers-reduced-motion` by
   switching the frame loop to on-demand and holding static, state-distinct poses
   (state is still conveyed by pose, indicator colour, and text — never motion
   alone).
8. **Fallback + resilience:** a WebGL-support check plus a dedicated error boundary
   (`MotiAvatarErrorBoundary`) degrade to the on-brand 2D `MotiAvatarFallback`
   (never a raw WebGL/stack-trace message); the conversation and workspace keep
   working.
9. **Performance:** capped DPR, low geometry, a single Canvas, and a frame loop
   paused (via IntersectionObserver + `visibilitychange`) when the avatar is
   offscreen (an inactive mobile panel) or the tab is hidden — so switching mobile
   panels never creates a second WebGL context.

**Current concept is still a static label** in this phase (not AI-derived);
AI-driven concept detection is later work.

## Local persistence strategy

- **Store:** browser `localStorage`, accessed through a single typed module
  (`lib/storage/course-configuration-storage.ts`) — never read/written ad hoc
  across components.
- **Key:** one versioned key, defined in one place:
  `moti-ai:course-configuration:v1`.
- **What is stored (Phase 3):** the `CourseConfiguration` — course title,
  learner level, learning objective, assistant instructions, and knowledge
  documents (**extracted text + safe metadata only; never File objects**).
  Mastery status and the Memory Echo queue join later phases.
- **Loading is hydration-safe:** the first render uses a deterministic default
  (matching SSR); persisted data is loaded on the client after mount, avoiding
  hydration mismatches.
- **Validation & recovery:** parsed data is validated with type guards before
  use; malformed or outdated data is discarded and the default sample course is
  used instead. Write failures (quota / private mode) are caught and surfaced
  honestly.
- **Scope:** per-browser profile / per-device only; no cross-device sync.

## Security boundaries

- **Local-only document processing (Phase 3):** uploaded/pasted content is
  parsed entirely in the browser and never sent over the network. Only extracted
  text and safe metadata are persisted — never the original binary files.
- **Local-only retrieval (Phase 4):** chunking, indexing, and search run in the
  browser. No document or query is sent over the network, no search/analytics
  service is used, and search history is not persisted. Retrieved chunk text is
  rendered as plain text (React-escaped `<pre>`), consistent with the document
  preview.
- **Untrusted content is rendered as plain text:** extracted document text is
  shown via React-escaped `<pre>` only. `dangerouslySetInnerHTML` is never used;
  Markdown/HTML in documents is never interpreted, so content cannot inject
  markup. Executable formats are rejected by type validation.
- **No document content is logged** to the console, and sensitive material is
  kept out of the sample course.
- **Secrets (Phase 5):** `GEMINI_API_KEY` lives only in server environment
  variables; never `NEXT_PUBLIC_`, never in a client component, and verified
  absent from the client bundle. The app builds and runs without it.
- **AI traffic (Phase 5):** exclusively server-side via `POST /api/chat`. The
  server validates request shape, bounds every field, sends only the ≤4 retrieved
  excerpts (never full documents), delimits/escapes source text as untrusted data,
  and re-validates the model's returned source ids. Model output renders as plain
  text (no `dangerouslySetInnerHTML`, no Markdown/HTML execution). Provider errors,
  stack traces, hidden prompts, query text, and source content are never returned
  to the client or logged.
- **Prompt injection is mitigated, not eliminated:** hard rules precede
  configurable instructions and sources are treated as data, but a determined
  attacker may still influence output. Documented as a prototype limitation.
- **Public endpoint:** `/api/chat` is unauthenticated and rate-limited only by the
  provider quota. Production would need server-side rate limiting and auth; no
  third-party rate-limiter is added in this phase.

## Planned module structure

```
# Present structure (through Phase 6 — interactive 3D Moti assistant)
src/
  app/
    layout.tsx            # root layout, fonts, metadata
    page.tsx              # CourseConfigurationProvider + workspace shell
    globals.css           # Tailwind v4 theme + brand tokens + motion
    api/chat/route.ts     # POST-only Gemini route handler (Node runtime)
  components/
    layout/               # AppHeader, LearningWorkspace shell, MobilePanelTabs
    assistant/            # AssistantPanel, MotiAvatar (client-only dynamic import),
                          #   MotiCanvas, MotiCharacter, MotiFace, MotiStateEffects,
                          #   MotiAvatarFallback, MotiAvatarErrorBoundary
    chat/                 # ConversationPanel, ChatMessage, MessageComposer,
                          #   LearningActions, SuggestedPrompts, ConversationError,
                          #   AiPrivacyNotice, AiConsentDialog
    learning/             # JourneyPanel, MemoryEcho
    settings/             # SettingsDrawer, CourseSettingsForm, KnowledgeUploader,
                          #   PasteKnowledgeForm, KnowledgeDocumentList/Card,
                          #   GroundingLab, RetrievalResultCard, formPrimitives
    ui/                   # icons (inline SVG), MasteryBadge, PlainTextPreviewDialog
  contexts/
    CourseConfigurationContext.tsx  # configuration state boundary (Context)
  hooks/
    useCourseConfiguration.ts       # typed accessor for the context
    useKnowledgeIndex.ts            # memoized in-memory index (rebuilds on change)
    useMotiConversation.ts          # conversation state, send/cancel/retry/consent
    useMotiVisualState.ts           # conversation → MotiVisualState (+ explaining window)
    useReducedMotion.ts             # prefers-reduced-motion (useSyncExternalStore)
  data/
    demo-data.ts          # typed mock data (assistant panel, journey, echo)
    sample-course.ts      # deterministic default course + sample document
  lib/
    types.ts              # shared TypeScript types (incl. MotiVisualState)
    documents/            # pure ingestion (constants, validation, parse, ...)
    chunking/             # constants, split-sections, chunk-document, build-chunks
    retrieval/            # tokenize, build-index, score-chunk, retrieve-knowledge
    storage/              # course-configuration-storage (versioned localStorage)
    chat/                 # constants, validate-chat-request, conversation-history
    ai/                   # constants, gemini-client, moti-system-instruction,
                          #   prompt-builder, response-schema, validate-ai-response,
                          #   error-mapping, generate-moti-response  (server-only)
    avatar/               # constants (3D colours + durations), state-mapping,
                          #   animation-config  (pure, no three import → WebGL-free tests)

# Automated tests (Vitest, dev-only): co-located *.test.ts under lib/chunking,
# lib/retrieval, lib/chat, lib/ai, and lib/avatar; run with `npm test`. No test
# calls the real Gemini API and no test creates a WebGL context — the generation
# and avatar-mapping boundaries are pure/mockable.

# Planned additions (created in the phase that first needs them)
src/
  app/api/
    evaluate/route.ts     # teach-back / misconception handler (Phase 7)
```

_This layout is a target. Directories are created in the phase that first needs
them — not preemptively._

## Important architectural trade-offs

- **localStorage vs. cloud DB:** chosen for zero infra and challenge fit; costs
  cross-device sync and multi-user support. Acceptable for a prototype.
- **Lightweight grounding vs. full RAG:** chosen for scope/time; adequate for
  small demo sources but not for large corpora. RAG is explicit future work.
- **Server-proxied AI vs. direct client calls:** proxying adds a hop but is
  non-negotiable for key safety and grounding control.
- **Client-side PDF.js vs. server parsing:** keeps files on the client and avoids
  a backend service, at the cost of doing extraction work in the browser.
- **React Three Fiber vs. 2D animation:** delivers the signature 3D assistant but
  requires WebGL and adds bundle weight; introduced only in its phase.
- **Next.js monolith vs. split SPA + API:** one deployable keeps secrets server
  side and simplifies Vercel deployment, at the cost of blending concerns that a
  strict module structure must keep separated.
