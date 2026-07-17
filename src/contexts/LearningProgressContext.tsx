"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import type {
  ConceptProgress,
  LearningProgressState,
  MemoryEchoItem,
  MemoryEchoReviewDecision,
  SaveLearningOutcomeInput,
} from "@/lib/types";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import {
  emptyProgressState,
  removeMemoryEchoItem,
  rescheduleMemoryEchoItem,
  resetCourseProgress,
  reviewMemoryEchoItem,
  saveOutcome,
  type ProgressMutation,
} from "@/lib/progress/reducer";
import {
  loadLearningProgress,
  saveLearningProgress,
} from "@/lib/progress/storage";
import {
  conceptsForCourse,
  memoryEchoItemsForCourse,
} from "@/lib/progress/selectors";

export type ProgressActionResult =
  | { ok: true; alreadySaved?: boolean }
  | { ok: false; reason: string };

export interface LearningProgressContextValue {
  /** True once saved progress has been read in the browser. */
  hydrated: boolean;
  /** Concepts for the active course only. */
  concepts: ConceptProgress[];
  /** Review items for the active course only. */
  memoryEchoItems: MemoryEchoItem[];
  /** The last storage error, surfaced honestly rather than swallowed. */
  storageError: string | null;
  isActivitySaved: (activityId: string) => boolean;
  saveLearningOutcome: (input: SaveLearningOutcomeInput) => ProgressActionResult;
  reviewItem: (
    itemId: string,
    decision: MemoryEchoReviewDecision,
  ) => ProgressActionResult;
  rescheduleItem: (itemId: string, dueAt: Date) => ProgressActionResult;
  removeItem: (itemId: string) => ProgressActionResult;
  resetCurrentCourse: () => ProgressActionResult;
}

export const LearningProgressContext =
  createContext<LearningProgressContextValue | null>(null);

function newId(prefix: string): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}_${crypto.randomUUID()}`;
  }
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Owns locally persisted learning progress.
 *
 * All the rules live in the pure `lib/progress` modules; this provider only adds
 * hydration, persistence, and course scoping. Progress is UI state only — it is
 * never added to chat history and never sent to Gemini or any route handler.
 */
export function LearningProgressProvider({ children }: { children: ReactNode }) {
  const { configuration } = useCourseConfiguration();
  const courseId = configuration.courseId;

  // The first render must match SSR, so start empty and load after mount.
  const [state, setState] = useState<LearningProgressState>(() =>
    emptyProgressState(new Date(0)),
  );
  const [hydrated, setHydrated] = useState(false);
  const [storageError, setStorageError] = useState<string | null>(null);
  const stateRef = useRef(state);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    const stored = loadLearningProgress();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (stored) {
      stateRef.current = stored;
      setState(stored);
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, []);

  /**
   * Commits a mutation: persists first, and only adopts the new state when the
   * write succeeds. On failure the in-memory state is left untouched, so the UI
   * never shows progress that was not actually saved.
   */
  const commit = useCallback((mutation: ProgressMutation): ProgressActionResult => {
    if (!mutation.ok) {
      setStorageError(mutation.reason);
      return { ok: false, reason: mutation.reason };
    }
    if (mutation.alreadySaved) {
      return { ok: true, alreadySaved: true };
    }

    const written = saveLearningProgress(mutation.state);
    if (!written.ok) {
      setStorageError(written.message);
      return { ok: false, reason: written.message };
    }

    stateRef.current = mutation.state;
    setState(mutation.state);
    setStorageError(null);
    return { ok: true };
  }, []);

  const saveLearningOutcome = useCallback(
    (input: SaveLearningOutcomeInput): ProgressActionResult =>
      commit(
        saveOutcome(stateRef.current, input, {
          now: new Date(),
          newEvidenceId: () => newId("ev"),
          newMemoryEchoItemId: () => newId("echo"),
        }),
      ),
    [commit],
  );

  const reviewItem = useCallback(
    (itemId: string, decision: MemoryEchoReviewDecision): ProgressActionResult =>
      commit(reviewMemoryEchoItem(stateRef.current, itemId, decision, new Date())),
    [commit],
  );

  const rescheduleItem = useCallback(
    (itemId: string, dueAt: Date): ProgressActionResult =>
      commit(rescheduleMemoryEchoItem(stateRef.current, itemId, dueAt, new Date())),
    [commit],
  );

  const removeItem = useCallback(
    (itemId: string): ProgressActionResult =>
      commit(removeMemoryEchoItem(stateRef.current, itemId, new Date())),
    [commit],
  );

  const resetCurrentCourse = useCallback(
    (): ProgressActionResult =>
      commit({
        ok: true,
        state: resetCourseProgress(stateRef.current, courseId, new Date()),
      }),
    [commit, courseId],
  );

  const value = useMemo<LearningProgressContextValue>(
    () => ({
      hydrated,
      concepts: conceptsForCourse(state, courseId),
      memoryEchoItems: memoryEchoItemsForCourse(state, courseId),
      storageError,
      isActivitySaved: (activityId: string) =>
        state.processedActivityIds.includes(activityId),
      saveLearningOutcome,
      reviewItem,
      rescheduleItem,
      removeItem,
      resetCurrentCourse,
    }),
    [
      hydrated,
      state,
      courseId,
      storageError,
      saveLearningOutcome,
      reviewItem,
      rescheduleItem,
      removeItem,
      resetCurrentCourse,
    ],
  );

  return (
    <LearningProgressContext.Provider value={value}>
      {children}
    </LearningProgressContext.Provider>
  );
}
