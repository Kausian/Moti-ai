"use client";

import { useContext } from "react";
import {
  LearningProgressContext,
  type LearningProgressContextValue,
} from "@/contexts/LearningProgressContext";

export function useLearningProgress(): LearningProgressContextValue {
  const context = useContext(LearningProgressContext);
  if (!context) {
    throw new Error(
      "useLearningProgress must be used within a LearningProgressProvider",
    );
  }
  return context;
}
