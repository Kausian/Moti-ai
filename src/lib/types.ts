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
