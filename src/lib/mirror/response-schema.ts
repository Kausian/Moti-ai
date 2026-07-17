// The JSON Schema Gemini must fill for a Moti Mirror teach-back. Structured
// output is requested via this schema, but the parsed result is still validated
// independently at runtime (see validate-mirror-response.ts) — the schema is a
// guide to the model, not a guarantee.

import { Type, type Schema } from "@google/genai";
import {
  MAX_CORRECT_UNDERSTANDING_ITEMS,
  MAX_FEEDBACK_SUMMARY_LENGTH,
  MAX_IMPROVED_EXPLANATION_LENGTH,
  MAX_LIST_ITEM_LENGTH,
  MAX_MASTERY_RATIONALE_LENGTH,
  MAX_MEMORY_ECHO_PROMPT_LENGTH,
  MAX_MISCONCEPTION_FIELD_LENGTH,
  MAX_MISCONCEPTIONS,
  MAX_MISSING_POINT_ITEMS,
  MAX_MIRROR_USED_SOURCE_IDS,
  MAX_CONCEPT_TITLE_LENGTH,
} from "./constants";

export const MOTI_MIRROR_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    responseMode: {
      type: Type.STRING,
      enum: ["teach-back-feedback", "insufficient-knowledge", "blocked"],
    },
    conceptTitle: {
      type: Type.STRING,
      maxLength: String(MAX_CONCEPT_TITLE_LENGTH),
      description: "The concept the learner was asked to explain.",
    },
    // Named for the SOURCES, not the learner. Without this description the model
    // reliably reads it as "the learner's knowledge is sufficient" and reports
    // false for a weak explanation, which contradicts teach-back-feedback.
    knowledgeSufficient: {
      type: Type.BOOLEAN,
      description:
        "Whether the PROVIDED SOURCES contain enough information to evaluate the explanation. This is about the source material ONLY — it is NOT a judgement of the learner. Set true whenever responseMode is 'teach-back-feedback', even if the learner's explanation is poor, empty, or wrong. Set false only when the sources themselves are inadequate (responseMode 'insufficient-knowledge').",
    },
    feedbackSummary: {
      type: Type.STRING,
      maxLength: String(MAX_FEEDBACK_SUMMARY_LENGTH),
      description: "A short, encouraging, specific summary of the coaching.",
    },
    correctUnderstanding: {
      type: Type.ARRAY,
      maxItems: String(MAX_CORRECT_UNDERSTANDING_ITEMS),
      items: { type: Type.STRING, maxLength: String(MAX_LIST_ITEM_LENGTH) },
    },
    missingPoints: {
      type: Type.ARRAY,
      maxItems: String(MAX_MISSING_POINT_ITEMS),
      items: { type: Type.STRING, maxLength: String(MAX_LIST_ITEM_LENGTH) },
    },
    misconceptions: {
      type: Type.ARRAY,
      maxItems: String(MAX_MISCONCEPTIONS),
      items: {
        type: Type.OBJECT,
        properties: {
          learnerIdea: {
            type: Type.STRING,
            maxLength: String(MAX_MISCONCEPTION_FIELD_LENGTH),
          },
          correction: {
            type: Type.STRING,
            maxLength: String(MAX_MISCONCEPTION_FIELD_LENGTH),
          },
        },
        required: ["learnerIdea", "correction"],
        propertyOrdering: ["learnerIdea", "correction"],
      },
    },
    improvedExplanation: {
      type: Type.STRING,
      maxLength: String(MAX_IMPROVED_EXPLANATION_LENGTH),
    },
    masteryRecommendation: {
      type: Type.STRING,
      enum: ["not-evaluated", "exploring", "developing", "understood"],
      description:
        "The rubric outcome for the learner's explanation. Use 'not-evaluated' ONLY when responseMode is 'insufficient-knowledge' or 'blocked'. When responseMode is 'teach-back-feedback' you must choose exploring, developing, or understood — an absent, off-topic, or rule-breaking explanation is 'exploring', never 'not-evaluated'.",
    },
    masteryRationale: {
      type: Type.STRING,
      maxLength: String(MAX_MASTERY_RATIONALE_LENGTH),
    },
    usedSourceIds: {
      type: Type.ARRAY,
      maxItems: String(MAX_MIRROR_USED_SOURCE_IDS),
      items: { type: Type.STRING },
    },
    nextAction: {
      type: Type.STRING,
      enum: [
        "retry-teach-back",
        "review-explanation",
        "give-example",
        "continue-learning",
      ],
    },
    memoryEchoPrompt: {
      type: Type.STRING,
      maxLength: String(MAX_MEMORY_ECHO_PROMPT_LENGTH),
    },
  },
  required: [
    "responseMode",
    "conceptTitle",
    "knowledgeSufficient",
    "feedbackSummary",
    "correctUnderstanding",
    "missingPoints",
    "misconceptions",
    "improvedExplanation",
    "masteryRecommendation",
    "masteryRationale",
    "usedSourceIds",
    "nextAction",
  ],
  propertyOrdering: [
    "responseMode",
    "conceptTitle",
    "knowledgeSufficient",
    "feedbackSummary",
    "correctUnderstanding",
    "missingPoints",
    "misconceptions",
    "improvedExplanation",
    "masteryRecommendation",
    "masteryRationale",
    "usedSourceIds",
    "nextAction",
    "memoryEchoPrompt",
  ],
};
