// The JSON Schemas Gemini must fill for challenge generation and free-response
// evaluation. Structured output guides the model but is never trusted on its own
// — both payloads are re-validated at runtime.
//
// Note what is absent from the generation schema: `challengeId`. The server
// always assigns it (crypto.randomUUID), so the model is never asked for one and
// any id it invents would be ignored.
//
// Note what is absent from the evaluation schema: `masteryRecommendation` and
// `nextAction`. Those are app policy derived deterministically by
// `applyAttemptPolicy`, so the model cannot grant mastery or hand out retries.

import { Type, type Schema } from "@google/genai";
import {
  CHOICE_OPTION_COUNT,
  MAX_CHALLENGE_CONCEPT_LENGTH,
  MAX_CHALLENGE_CORRECTION_LENGTH,
  MAX_CHALLENGE_EXPLANATION_LENGTH,
  MAX_CHALLENGE_FEEDBACK_LENGTH,
  MAX_CHALLENGE_HINT_LENGTH,
  MAX_CHALLENGE_INSTRUCTIONS_LENGTH,
  MAX_CHALLENGE_LIST_ITEM_LENGTH,
  MAX_CHALLENGE_LIST_ITEMS,
  MAX_CHALLENGE_MEMORY_ECHO_LENGTH,
  MAX_CHALLENGE_OPTION_LENGTH,
  MAX_CHALLENGE_PROMPT_LENGTH,
  MAX_CHALLENGE_USED_SOURCE_IDS,
  MAX_ESSENTIAL_POINT_LENGTH,
  MAX_ESSENTIAL_POINTS,
  MAX_REFERENCE_ANSWER_LENGTH,
  MAX_REFERENCE_EXPLANATION_LENGTH,
} from "./constants";

export const CHALLENGE_GENERATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    challengeType: {
      type: Type.STRING,
      enum: ["multiple-choice", "scenario", "correct-the-mistake", "explain-in-own-words"],
      description: "The type of challenge you wrote. Must match the requested type.",
    },
    conceptTitle: {
      type: Type.STRING,
      maxLength: String(MAX_CHALLENGE_CONCEPT_LENGTH),
    },
    difficulty: {
      type: Type.STRING,
      enum: ["beginner", "intermediate", "advanced"],
      description: "Must match the requested difficulty.",
    },
    prompt: {
      type: Type.STRING,
      maxLength: String(MAX_CHALLENGE_PROMPT_LENGTH),
      description:
        "The challenge itself: the question, scenario, or incorrect statement the learner must respond to.",
    },
    instructions: {
      type: Type.STRING,
      maxLength: String(MAX_CHALLENGE_INSTRUCTIONS_LENGTH),
      description: "One short line telling the learner what to do.",
    },
    hint: {
      type: Type.STRING,
      maxLength: String(MAX_CHALLENGE_HINT_LENGTH),
      description:
        "A targeted nudge shown ONLY after a failed first attempt. It must point toward the right reasoning WITHOUT revealing the answer.",
    },
    options: {
      type: Type.ARRAY,
      maxItems: String(CHOICE_OPTION_COUNT),
      description:
        "Exactly four options for multiple-choice/scenario. Omit entirely for free-response types.",
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING, description: "A short unique id such as a, b, c, d." },
          text: { type: Type.STRING, maxLength: String(MAX_CHALLENGE_OPTION_LENGTH) },
        },
        required: ["id", "text"],
        propertyOrdering: ["id", "text"],
      },
    },
    correctOptionId: {
      type: Type.STRING,
      description:
        "For multiple-choice/scenario: the id of the single correct option. Omit for free-response types.",
    },
    referenceExplanation: {
      type: Type.STRING,
      maxLength: String(MAX_REFERENCE_EXPLANATION_LENGTH),
      description:
        "For multiple-choice/scenario: why the correct option is right and the main distractor is wrong, grounded in the sources.",
    },
    referenceAnswer: {
      type: Type.STRING,
      maxLength: String(MAX_REFERENCE_ANSWER_LENGTH),
      description:
        "For correct-the-mistake/explain-in-own-words: a concise model answer grounded in the sources. Omit for choice types.",
    },
    essentialPoints: {
      type: Type.ARRAY,
      maxItems: String(MAX_ESSENTIAL_POINTS),
      description:
        "For free-response types: what a good answer must contain. Omit for choice types.",
      items: { type: Type.STRING, maxLength: String(MAX_ESSENTIAL_POINT_LENGTH) },
    },
    usedSourceIds: {
      type: Type.ARRAY,
      maxItems: String(MAX_CHALLENGE_USED_SOURCE_IDS),
      description: "Only the exact source ids this challenge was built from.",
      items: { type: Type.STRING },
    },
  },
  required: [
    "challengeType",
    "conceptTitle",
    "difficulty",
    "prompt",
    "instructions",
    "hint",
    "usedSourceIds",
  ],
  propertyOrdering: [
    "challengeType",
    "conceptTitle",
    "difficulty",
    "prompt",
    "instructions",
    "hint",
    "options",
    "correctOptionId",
    "referenceExplanation",
    "referenceAnswer",
    "essentialPoints",
    "usedSourceIds",
  ],
};

export const CHALLENGE_EVALUATION_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    outcome: {
      type: Type.STRING,
      enum: ["correct", "partially-correct", "incorrect", "not-evaluated"],
      description:
        "Judge conceptual understanding only. Use 'not-evaluated' ONLY when the sources cannot support marking the answer.",
    },
    feedback: {
      type: Type.STRING,
      maxLength: String(MAX_CHALLENGE_FEEDBACK_LENGTH),
      description: "Concise, specific, encouraging. No exaggerated praise.",
    },
    correctUnderstanding: {
      type: Type.ARRAY,
      maxItems: String(MAX_CHALLENGE_LIST_ITEMS),
      description: "What the learner got right. May be empty.",
      items: { type: Type.STRING, maxLength: String(MAX_CHALLENGE_LIST_ITEM_LENGTH) },
    },
    missingPoints: {
      type: Type.ARRAY,
      maxItems: String(MAX_CHALLENGE_LIST_ITEMS),
      description:
        "Essential points from the sources the answer omitted. May be empty. Only include points the sources actually contain.",
      items: { type: Type.STRING, maxLength: String(MAX_CHALLENGE_LIST_ITEM_LENGTH) },
    },
    correction: {
      type: Type.STRING,
      maxLength: String(MAX_CHALLENGE_CORRECTION_LENGTH),
      description:
        "Only when the answer contains a material misconception: state the correction. Omit otherwise.",
    },
    explanation: {
      type: Type.STRING,
      maxLength: String(MAX_CHALLENGE_EXPLANATION_LENGTH),
      description:
        "The full grounded explanation of the correct answer. The app decides when to reveal it.",
    },
    usedSourceIds: {
      type: Type.ARRAY,
      maxItems: String(MAX_CHALLENGE_USED_SOURCE_IDS),
      description: "Only the exact source ids that support this marking.",
      items: { type: Type.STRING },
    },
    memoryEchoPrompt: {
      type: Type.STRING,
      maxLength: String(MAX_CHALLENGE_MEMORY_ECHO_LENGTH),
      description: "One short recall question for later review.",
    },
  },
  required: [
    "outcome",
    "feedback",
    "correctUnderstanding",
    "missingPoints",
    "explanation",
    "usedSourceIds",
  ],
  propertyOrdering: [
    "outcome",
    "feedback",
    "correctUnderstanding",
    "missingPoints",
    "correction",
    "explanation",
    "usedSourceIds",
    "memoryEchoPrompt",
  ],
};
