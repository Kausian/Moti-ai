// Typed data for the parts of the workspace not backed by real state.
//
// The Mastery Journey and Memory Echo mocks were removed in Phase 9 — both panels
// now render only real, learner-saved progress. What remains is the assistant
// panel's descriptor and its default concept/stage, shown when no learning
// activity is open.

import type { DemoCourse, LoopStage } from "@/lib/types";

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
