// Typed mock data for the Moti AI static learning workspace (Phase 2).
// Everything the interface shows comes from here. There is no AI, retrieval,
// file parsing, or persistence in this phase — these are illustrative examples.

import type {
  ChatMessage,
  DemoCourse,
  KnowledgeDocument,
  LearningAction,
  LearningConcept,
  LoopStage,
  ReviewItem,
  SourceReference,
} from "@/lib/types";

export const LOOP_STAGES: LoopStage[] = [
  "Think",
  "Explain",
  "Correct",
  "Remember",
];

export const demoCourse: DemoCourse = {
  title: "Responsible AI and Prompt Engineering Fundamentals",
  descriptor: "Your source-grounded learning coach",
  learnerLevel: "Beginner",
  objective:
    "Understand how large language models can mislead, and learn to prompt them responsibly.",
  motiInstructions:
    "Be warm and encouraging. Never just give the answer — ask the learner to think and explain first, then correct gently using only the supplied sources.",
  currentConcept: "AI Hallucinations",
  assistantStatus: "Explaining",
  currentStage: "Correct",
};

const hallucinationSource: SourceReference = {
  id: "src-rai-3",
  title: "Responsible AI Guide",
  section: "Section 3: Hallucinations",
};

export const demoConversation: ChatMessage[] = [
  {
    id: "m1",
    role: "learner",
    content: "What is an AI hallucination?",
  },
  {
    id: "m2",
    role: "moti",
    kind: "invite-explanation",
    content:
      "Good question — this is a big one. Before I explain, tell me in your own words: what do you think an AI hallucination is? Putting it into your own words first helps it stick.",
    suggestedActions: ["Teach it back"],
  },
  {
    id: "m3",
    role: "learner",
    content: "It means the AI stops working because it becomes confused.",
  },
  {
    id: "m4",
    role: "moti",
    kind: "mirror",
    content: "Thanks for trying that — here's how your explanation lines up.",
    sources: [hallucinationSource],
    mirror: {
      recognised:
        "You sensed that a hallucination is about something going wrong with the AI's output — that instinct is right.",
      misconception:
        "A hallucination isn't the AI crashing or stopping. The model keeps running normally; the problem is the content it produces, not a technical failure.",
      correction:
        "An AI hallucination is when the model states something false or unsupported as if it were true — confidently generating information that isn't backed by its sources.",
      source: hallucinationSource,
      mastery: "developing",
      nextAction:
        "Try teaching it back in one sentence to move from Developing toward Understood.",
    },
    suggestedActions: ["Teach it back", "Give an example"],
  },
];

export const learningActions: LearningAction[] = [
  { id: "explain-simply", label: "Explain simply", hint: "Ask for a plainer explanation" },
  { id: "give-example", label: "Give an example", hint: "See a concrete example" },
  { id: "challenge-me", label: "Challenge me", hint: "Try an adaptive micro-challenge" },
  { id: "teach-it-back", label: "Teach it back", hint: "Explain it in your own words" },
  { id: "show-source", label: "Show source", hint: "Open the supporting source" },
];

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

export const knowledgeDocuments: KnowledgeDocument[] = [
  {
    id: "doc-rai-guide",
    name: "Responsible AI Guide.pdf",
    kind: "PDF",
    meta: "Sample source · 14 sections",
  },
  {
    id: "doc-prompt-basics",
    name: "Prompt Engineering Basics.md",
    kind: "Markdown",
    meta: "Sample source · 6 sections",
  },
  {
    id: "doc-glossary",
    name: "AI Safety Glossary.txt",
    kind: "TXT",
    meta: "Sample source · 42 terms",
  },
];
