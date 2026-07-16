"use client";

import { useContext } from "react";
import {
  CourseConfigurationContext,
  type CourseConfigurationContextValue,
} from "@/contexts/CourseConfigurationContext";

export function useCourseConfiguration(): CourseConfigurationContextValue {
  const context = useContext(CourseConfigurationContext);
  if (!context) {
    throw new Error(
      "useCourseConfiguration must be used within a CourseConfigurationProvider",
    );
  }
  return context;
}
