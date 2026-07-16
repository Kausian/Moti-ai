// Shared TypeScript types for Moti AI.
// Phase 2 introduced the static workspace types; Phase 3 adds the configurable
// course + knowledge-document models that are persisted in the browser.

export type AssistantStatus =
  | "Ready"
  | "Listening"
  | "Thinking"
  | "Explaining"
  | "Celebrating";

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
