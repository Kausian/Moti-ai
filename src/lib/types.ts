// Shared TypeScript types for Moti AI's static learning workspace (Phase 2).
// These model the product concepts the interface displays. All values are
// currently supplied as typed mock data; no runtime persistence or AI yet.

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

export interface KnowledgeDocument {
  id: string;
  name: string;
  kind: "PDF" | "TXT" | "Markdown";
  meta: string;
}

/** A quick learning action offered near the composer. */
export interface LearningAction {
  id: string;
  label: string;
  hint: string;
}

/** The configured course/session Moti is coaching. */
export interface DemoCourse {
  title: string;
  descriptor: string;
  learnerLevel: string;
  objective: string;
  motiInstructions: string;
  currentConcept: string;
  assistantStatus: AssistantStatus;
  currentStage: LoopStage;
}
