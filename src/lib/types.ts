// Shared TypeScript types for Moti AI.
// Phase 2 introduced the static workspace types; Phase 3 adds the configurable
// course + knowledge-document models that are persisted in the browser.

export type AssistantStatus =
  | "Ready"
  | "Listening"
  | "Thinking"
  | "Explaining"
  | "Celebrating";

/**
 * The explicit visual states of the 3D Moti assistant (Phase 6). Driven by real
 * conversation behaviour via `lib/avatar/state-mapping`, never by arbitrary
 * strings. `celebrating` is a supported state reserved for a later
 * challenge-success phase; the conversation mapping does not currently emit it.
 */
export type MotiVisualState =
  | "idle"
  | "listening"
  | "thinking"
  | "explaining"
  | "celebrating"
  | "error";

export type MasteryStatus = "exploring" | "developing" | "understood";

export type LoopStage = "Think" | "Explain" | "Correct" | "Remember";

export type ChatRole = "learner" | "moti";

/** How a Moti message should be presented in the conversation. */
export type MotiResponseKind = "answer" | "invite-explanation" | "mirror";

export interface SourceReference {
  id: string;
  /** Document title, e.g. "Responsible AI Guide". */
  title: string;
  /** Location within the document, e.g. "Section 3: Hallucinations". */
  section: string;
}

/** Teach-back feedback shown in the reusable Moti Mirror card. */
export interface MotiMirror {
  recognised: string;
  misconception: string;
  correction: string;
  source: SourceReference;
  mastery: MasteryStatus;
  nextAction: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  /** Present on Moti messages to drive their visual treatment. */
  kind?: MotiResponseKind;
  sources?: SourceReference[];
  suggestedActions?: string[];
  /** Present when `kind === "mirror"`. */
  mirror?: MotiMirror;
}

export interface LearningConcept {
  id: string;
  name: string;
  status: MasteryStatus;
  detail: string;
  /** When true, the concept surfaces in the "ready for review" group. */
  dueForReview?: boolean;
}

export type ReviewTiming = "due" | "later";

export interface ReviewItem {
  id: string;
  prompt: string;
  concept: string;
  timing: ReviewTiming;
}

/** A quick learning action offered near the composer. */
export interface LearningAction {
  id: string;
  label: string;
  hint: string;
}

/** Visual-only fields that drive the assistant panel and conversation shell. */
export interface DemoCourse {
  descriptor: string;
  currentConcept: string;
  assistantStatus: AssistantStatus;
  currentStage: LoopStage;
}

// ---------------------------------------------------------------------------
// Phase 3 — configurable course + knowledge documents (persisted locally)
// ---------------------------------------------------------------------------

export type LearnerLevel = "beginner" | "intermediate" | "advanced";

/** Where a knowledge document came from. */
export type KnowledgeDocumentSource = "sample" | "upload" | "pasted";

/** Classification of a document's original format. */
export type SupportedDocumentType = "pdf" | "txt" | "markdown" | "plain-text";

/**
 * A single piece of learning material. Only extracted text and safe metadata
 * are ever stored — never the original binary File.
 */
export interface KnowledgeDocument {
  id: string;
  title: string;
  originalFileName?: string;
  source: KnowledgeDocumentSource;
  documentType: SupportedDocumentType;
  mimeType?: string;
  sizeBytes?: number;
  characterCount: number;
  content: string;
  /** ISO 8601 timestamp. */
  addedAt: string;
}

/** The full, persistable course configuration. */
export interface CourseConfiguration {
  courseTitle: string;
  learnerLevel: LearnerLevel;
  learningObjective: string;
  assistantInstructions: string;
  documents: KnowledgeDocument[];
}

// ---------------------------------------------------------------------------
// Phase 4 — knowledge chunking, indexing & retrieval (all in-memory, local)
// ---------------------------------------------------------------------------

/** A section- and paragraph-aware slice of a knowledge document. */
export interface KnowledgeChunk {
  /** Stable id of the form `${documentId}:chunk:${chunkIndex}`. */
  id: string;
  documentId: string;
  documentTitle: string;
  documentType: SupportedDocumentType;
  /** Zero-based index within its document. */
  chunkIndex: number;
  /** The most recent Markdown heading above this chunk, when present. */
  sectionHeading?: string;
  content: string;
  /** Offsets into the document's original `content` (never mutated). */
  characterStart: number;
  characterEnd: number;
  characterCount: number;
}

/** A chunk enriched with the derived data the lexical index needs. */
export interface IndexedKnowledgeChunk extends KnowledgeChunk {
  /** Lowercased title + heading + content, used for exact-phrase matching. */
  searchableText: string;
  /** Meaningful content tokens (stop words removed). */
  terms: string[];
  termFrequencies: Record<string, number>;
  /** Number of terms — the chunk length used for BM25 normalization. */
  length: number;
}

export interface KnowledgeIndexStats {
  documentCount: number;
  chunkCount: number;
  totalIndexedCharacters: number;
  averageChunkLength: number;
}

/** The in-memory index derived from the active documents (never persisted). */
export interface KnowledgeIndex {
  chunks: IndexedKnowledgeChunk[];
  stats: KnowledgeIndexStats;
  /** Chunks each term appears in, for IDF. */
  documentFrequencies: Record<string, number>;
  /** Average terms-per-chunk, for BM25 length normalization. */
  averageTermCount: number;
}

/** Transparent, per-signal breakdown of a chunk's retrieval score. */
export interface RetrievalScoreBreakdown {
  contentScore: number;
  titleBoost: number;
  headingBoost: number;
  phraseBoost: number;
  coverageBoost: number;
  total: number;
}

export interface KnowledgeRetrievalResult {
  chunk: KnowledgeChunk;
  score: number;
  matchedTerms: string[];
  scoreBreakdown: RetrievalScoreBreakdown;
  excerpt: string;
}

export interface KnowledgeRetrievalResponse {
  query: string;
  meaningfulQueryTerms: string[];
  results: KnowledgeRetrievalResult[];
  hasRelevantKnowledge: boolean;
}

// ---------------------------------------------------------------------------
// Phase 5 — Gemini-grounded conversation (local retrieval, remote generation)
// ---------------------------------------------------------------------------

export type ConversationRole = "user" | "assistant";

export interface ConversationHistoryItem {
  role: ConversationRole;
  content: string;
}

/** A retrieved source excerpt the client sends to the server for one question. */
export interface ChatSourceInput {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sectionHeading?: string;
  chunkIndex: number;
  content: string;
}

/** The request the browser POSTs to /api/chat. All fields are untrusted. */
export interface MotiChatRequest {
  message: string;
  history: ConversationHistoryItem[];
  course: {
    title: string;
    learnerLevel: LearnerLevel;
    learningObjective: string;
    assistantInstructions: string;
  };
  sources: ChatSourceInput[];
}

export type MotiResponseMode =
  | "grounded-answer"
  | "clarifying-question"
  | "insufficient-knowledge"
  | "blocked";

export type SuggestedLearningAction =
  | "explain-simply"
  | "give-example"
  | "show-source"
  | "ask-follow-up";

/** The structured JSON Moti must return (validated at runtime). */
export interface MotiStructuredResponse {
  responseMode: MotiResponseMode;
  answer: string;
  knowledgeSufficient: boolean;
  usedSourceIds: string[];
  suggestedActions: SuggestedLearningAction[];
  followUpQuestion?: string;
}

export type ChatErrorCode =
  | "invalid-request"
  | "not-configured"
  | "auth-failed"
  | "model-unavailable"
  | "rate-limited"
  | "timeout"
  | "safety-blocked"
  | "malformed-response"
  | "provider-error";

/** The safe error shape returned to the client (never a raw provider error). */
export interface ChatErrorPayload {
  code: ChatErrorCode;
  message: string;
  retryable: boolean;
}

export type ConversationMessageStatus = "complete" | "sending" | "failed";

/** A source attached to a completed answer, shown as a chip / preview. */
export interface ConversationSource {
  id: string;
  /** Retained so a teach-back (Phase 7) can re-send the exact source metadata. */
  documentId: string;
  documentTitle: string;
  sectionHeading?: string;
  content: string;
  chunkIndex: number;
}

/** A single message held in the in-memory conversation (not persisted). */
export interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  /** ISO 8601 timestamp. */
  createdAt: string;
  status: ConversationMessageStatus;
  responseMode?: MotiResponseMode;
  sources?: ConversationSource[];
  suggestedActions?: SuggestedLearningAction[];
}

// ---------------------------------------------------------------------------
// Phase 7 — Moti Mirror teach-back (POST /api/teach-back)
//
// Deliberately separate from the chat contract above: teach-back has its own
// request, prompt, schema, and validation rules. Normal conversation history is
// never part of a teach-back request — the explanation is evaluated on its own
// against the selected answer's validated sources.
// ---------------------------------------------------------------------------

/** The four stages of the Moti Learning Loop, as an activity progresses. */
export type MotiLearningLoopStage = "think" | "explain" | "correct" | "remember";

/** A validated source excerpt attached to the answer being taught back. */
export interface TeachBackSourceInput {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sectionHeading?: string;
  chunkIndex: number;
  content: string;
}

/** The request the browser POSTs to /api/teach-back. All fields are untrusted. */
export interface MotiMirrorRequest {
  conceptTitle: string;
  learnerExplanation: string;
  course: {
    title: string;
    learnerLevel: LearnerLevel;
    learningObjective: string;
    assistantInstructions: string;
  };
  sources: TeachBackSourceInput[];
}

export type MotiMirrorResponseMode =
  | "teach-back-feedback"
  | "insufficient-knowledge"
  | "blocked";

/**
 * A prototype learning recommendation — never a formal educational assessment,
 * and never applied to the Mastery Journey in this phase.
 */
export type MotiMirrorMasteryRecommendation =
  | "not-evaluated"
  | "exploring"
  | "developing"
  | "understood";

export type MotiMirrorNextAction =
  | "retry-teach-back"
  | "review-explanation"
  | "give-example"
  | "continue-learning";

export interface MotiMirrorMisconception {
  /** The learner's idea, paraphrased — never a fabricated quote. */
  learnerIdea: string;
  correction: string;
}

// ---------------------------------------------------------------------------
// Phase 8 — adaptive micro-challenges
//   POST /api/challenge/generate  → a grounded challenge
//   POST /api/challenge/evaluate  → a graded result
//
// Deliberately separate from both the chat and teach-back contracts. A challenge
// is Moti setting a focused task and grading the response; a teach-back is the
// learner explaining first and receiving detailed coaching.
// ---------------------------------------------------------------------------

export type MotiChallengeType =
  | "multiple-choice"
  | "scenario"
  | "correct-the-mistake"
  | "explain-in-own-words";

/**
 * A learner-selectable difficulty. This shapes how the challenge is written; it
 * is not a measurement of the learner's ability.
 */
export type MotiChallengeDifficulty = "beginner" | "intermediate" | "advanced";

/** A validated source excerpt attached to the answer being challenged. */
export interface ChallengeSourceInput {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sectionHeading?: string;
  chunkIndex: number;
  content: string;
}

export interface ChallengeCourseContext {
  title: string;
  learnerLevel: LearnerLevel;
  learningObjective: string;
  assistantInstructions: string;
}

/** The request the browser POSTs to /api/challenge/generate. Untrusted. */
export interface GenerateChallengeRequest {
  conceptTitle: string;
  /** "auto" lets Moti choose the type that best suits the source. */
  requestedType: MotiChallengeType | "auto";
  difficulty: MotiChallengeDifficulty;
  course: ChallengeCourseContext;
  sources: ChallengeSourceInput[];
}

export interface ChallengeOption {
  id: string;
  text: string;
}

export interface GeneratedChallengeBase {
  /** Always generated by the server — never trusted from the model. */
  challengeId: string;
  challengeType: MotiChallengeType;
  conceptTitle: string;
  difficulty: MotiChallengeDifficulty;
  prompt: string;
  instructions: string;
  /**
   * One targeted nudge shown after a first failed attempt, so a retry stays
   * useful without revealing the full answer — and without a second AI call.
   */
  hint: string;
  usedSourceIds: string[];
}

export interface GeneratedChoiceChallenge extends GeneratedChallengeBase {
  challengeType: "multiple-choice" | "scenario";
  options: ChallengeOption[];
  correctOptionId: string;
  referenceExplanation: string;
}

export interface GeneratedFreeResponseChallenge extends GeneratedChallengeBase {
  challengeType: "correct-the-mistake" | "explain-in-own-words";
  referenceAnswer: string;
  essentialPoints: string[];
}

export type GeneratedMotiChallenge =
  | GeneratedChoiceChallenge
  | GeneratedFreeResponseChallenge;

export type ChallengeOutcome =
  | "correct"
  | "partially-correct"
  | "incorrect"
  | "not-evaluated";

export type ChallengeNextAction =
  | "continue"
  | "retry"
  | "review-source"
  | "try-another";

/** The request the browser POSTs to /api/challenge/evaluate. Untrusted. */
export interface EvaluateChallengeRequest {
  /** Re-validated server-side; challenge state from the browser is not trusted. */
  challenge: GeneratedMotiChallenge;
  learnerResponse: {
    selectedOptionId?: string;
    writtenAnswer?: string;
  };
  attemptNumber: number;
  course: {
    learnerLevel: LearnerLevel;
    assistantInstructions: string;
  };
  sources: ChallengeSourceInput[];
}

/**
 * The graded result. `masteryRecommendation` is a prototype recommendation only —
 * never a grade, score, or formal assessment, and it never mutates the Mastery
 * Journey in this phase.
 */
export interface ChallengeEvaluationResult {
  challengeId: string;
  outcome: ChallengeOutcome;
  feedback: string;
  correctUnderstanding: string[];
  missingPoints: string[];
  correction?: string;
  explanation: string;
  masteryRecommendation: MotiMirrorMasteryRecommendation;
  usedSourceIds: string[];
  nextAction: ChallengeNextAction;
  memoryEchoPrompt?: string;
}

/** The structured JSON Moti Mirror must return (validated at runtime). */
export interface MotiMirrorStructuredResponse {
  responseMode: MotiMirrorResponseMode;
  conceptTitle: string;
  knowledgeSufficient: boolean;
  feedbackSummary: string;
  correctUnderstanding: string[];
  missingPoints: string[];
  misconceptions: MotiMirrorMisconception[];
  improvedExplanation: string;
  masteryRecommendation: MotiMirrorMasteryRecommendation;
  masteryRationale: string;
  usedSourceIds: string[];
  nextAction: MotiMirrorNextAction;
  memoryEchoPrompt?: string;
}
