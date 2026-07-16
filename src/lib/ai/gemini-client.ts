// Server-only Gemini client creation. The API key lives exclusively in server
// environment variables and is never sent to the browser. The model is read
// from GEMINI_MODEL with a safe fallback to a documented stable Flash model.

import { GoogleGenAI } from "@google/genai";
import { DEFAULT_GEMINI_MODEL } from "./constants";
import { AiError } from "./error-mapping";

export function isAiConfigured(): boolean {
  const key = process.env.GEMINI_API_KEY;
  return typeof key === "string" && key.trim().length > 0;
}

export function getConfiguredModel(): string {
  const model = process.env.GEMINI_MODEL?.trim();
  return model && model.length > 0 ? model : DEFAULT_GEMINI_MODEL;
}

export function createGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiError("not-configured", "GEMINI_API_KEY is not set");
  }
  return new GoogleGenAI({ apiKey });
}
