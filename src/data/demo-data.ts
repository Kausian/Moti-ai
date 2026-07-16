// Typed mock data for the parts of the workspace not yet backed by real state:
// the assistant panel, Mastery Journey, and Memory Echo. The conversation panel
// is now live (Phase 5); these remain illustrative until their phases.

import type {
  DemoCourse,
  LearningConcept,
  LoopStage,
  ReviewItem,
} from "@/lib/types";

export const LOOP_STAGES: LoopStage[] = [
  "Think",
  "Explain",
  "Correct",
  "Remember",
];

export const demoCourse: DemoCourse = {
  descriptor: "Your source-grounded learning coach",
  currentConcept: "AI Hallucinations",
  assistantStatus: "Explaining",
  currentStage: "Correct",
};

export const learningConcepts: LearningConcept[] = [
  {
    id: "c-hallucinations",
    name: "AI Hallucinations",
    status: "developing",
    detail: "You can spot the idea, but the definition is still forming.",
  },
  {
    id: "c-prompt-structure",
    name: "Prompt Structure",
    status: "understood",
    detail: "You reliably structure clear, well-scoped prompts.",
  },
  {
    id: "c-prompt-injection",
    name: "Prompt Injection",
    status: "exploring",
    detail: "A new concept you have just started to look at.",
  },
  {
    id: "c-responsible-use",
    name: "Responsible AI Use",
    status: "understood",
    detail: "Understood earlier — Memory Echo suggests a quick review.",
    dueForReview: true,
  },
];

export const reviewItems: ReviewItem[] = [
  {
    id: "r-hallucination",
    prompt: "Explain AI hallucination in your own words",
    concept: "AI Hallucinations",
    timing: "due",
  },
  {
    id: "r-stronger-prompt",
    prompt: "Identify the stronger workplace prompt",
    concept: "Prompt Structure",
    timing: "later",
  },
  {
    id: "r-injection-scenario",
    prompt: "Recognise a prompt-injection scenario",
    concept: "Prompt Injection",
    timing: "later",
  },
];

