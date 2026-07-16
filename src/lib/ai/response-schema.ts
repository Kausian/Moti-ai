// The JSON Schema Gemini must fill. Kept small with explicit required fields.
// Structured output is requested via this schema, but the parsed result is still
// validated independently at runtime (see validate-ai-response.ts).

import { Type, type Schema } from "@google/genai";
import {
  MAX_ANSWER_LENGTH,
  MAX_FOLLOW_UP_LENGTH,
  MAX_SUGGESTED_ACTIONS,
  MAX_USED_SOURCE_IDS,
} from "./constants";

export const MOTI_RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    responseMode: {
      type: Type.STRING,
      enum: [
        "grounded-answer",
        "clarifying-question",
        "insufficient-knowledge",
        "blocked",
      ],
    },
    answer: { type: Type.STRING, maxLength: String(MAX_ANSWER_LENGTH) },
    knowledgeSufficient: { type: Type.BOOLEAN },
    usedSourceIds: {
      type: Type.ARRAY,
      maxItems: String(MAX_USED_SOURCE_IDS),
      items: { type: Type.STRING },
    },
    suggestedActions: {
      type: Type.ARRAY,
      maxItems: String(MAX_SUGGESTED_ACTIONS),
      items: {
        type: Type.STRING,
        enum: ["explain-simply", "give-example", "show-source", "ask-follow-up"],
      },
    },
    followUpQuestion: { type: Type.STRING, maxLength: String(MAX_FOLLOW_UP_LENGTH) },
  },
  required: [
    "responseMode",
    "answer",
    "knowledgeSufficient",
    "usedSourceIds",
    "suggestedActions",
  ],
  propertyOrdering: [
    "responseMode",
    "answer",
    "knowledgeSufficient",
    "usedSourceIds",
    "suggestedActions",
    "followUpQuestion",
  ],
};
