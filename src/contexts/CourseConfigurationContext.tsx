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
import type { CourseConfiguration, KnowledgeDocument } from "@/lib/types";
import { createDefaultConfiguration } from "@/data/sample-course";
import {
  loadConfiguration,
  saveConfiguration as persistConfiguration,
} from "@/lib/storage/course-configuration-storage";
import {
  MAX_DOCUMENTS,
  MAX_TOTAL_EXTRACTED_CHARACTERS,
} from "@/lib/documents/constants";
import { findDuplicate } from "@/lib/documents/duplicates";
import { totalCharacterCount } from "@/lib/documents/format";
import { documentError, type DocumentError } from "@/lib/documents/errors";

export type SaveStatus = "idle" | "saved" | "error";

export interface SaveState {
  status: SaveStatus;
  message?: string;
}

export interface CourseFormErrors {
  courseTitle?: string;
  learningObjective?: string;
  assistantInstructions?: string;
}

export type AddDocumentResult =
  | { ok: true; document: KnowledgeDocument }
  | { ok: false; error: DocumentError };

type CourseFieldPatch = Partial<
  Pick<
    CourseConfiguration,
    "courseTitle" | "learnerLevel" | "learningObjective" | "assistantInstructions"
  >
>;

export interface CourseConfigurationContextValue {
  configuration: CourseConfiguration;
  hydrated: boolean;
  isDirty: boolean;
  saveState: SaveState;
  formErrors: CourseFormErrors;
  courseIsValid: boolean;
  documentLimitReached: boolean;
  totalCharactersUsed: number;
  updateCourse: (patch: CourseFieldPatch) => void;
  addDocument: (document: KnowledgeDocument) => AddDocumentResult;
  removeDocument: (id: string) => void;
  resetSampleCourse: () => void;
  saveConfiguration: () => void;
}

export const CourseConfigurationContext =
  createContext<CourseConfigurationContextValue | null>(null);

function serialize(config: CourseConfiguration): string {
  return JSON.stringify(config);
}

function validateCourse(config: CourseConfiguration): CourseFormErrors {
  const errors: CourseFormErrors = {};
  if (config.courseTitle.trim().length === 0) {
    errors.courseTitle = "Add a course title.";
  }
  if (config.learningObjective.trim().length === 0) {
    errors.learningObjective = "Describe what the learner should achieve.";
  }
  if (config.assistantInstructions.trim().length === 0) {
    errors.assistantInstructions =
      "Add instructions that shape how Moti coaches.";
  }
  return errors;
}

export function CourseConfigurationProvider({ children }: { children: ReactNode }) {
  const [configuration, setConfiguration] = useState<CourseConfiguration>(
    createDefaultConfiguration,
  );
  const [savedSnapshot, setSavedSnapshot] = useState<string>(() =>
    serialize(createDefaultConfiguration()),
  );
  const [hydrated, setHydrated] = useState(false);
  const [saveState, setSaveState] = useState<SaveState>({ status: "idle" });
  const [formErrors, setFormErrors] = useState<CourseFormErrors>({});

  // A ref mirrors the current configuration so mutations can read and write
  // atomically even across rapid sequential calls (e.g. multi-file uploads).
  const configurationRef = useRef(configuration);

  const applyConfiguration = useCallback((next: CourseConfiguration) => {
    configurationRef.current = next;
    setConfiguration(next);
  }, []);

  // Load persisted configuration after mount (browser only). This intentionally
  // sets state in an effect: the first render must match the deterministic
  // default used during SSR, then we swap in any saved data on the client to
  // avoid a hydration mismatch.
  useEffect(() => {
    const stored = loadConfiguration();
    /* eslint-disable react-hooks/set-state-in-effect */
    if (stored) {
      applyConfiguration(stored);
      setSavedSnapshot(serialize(stored));
    }
    setHydrated(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [applyConfiguration]);

  const markUnsaved = useCallback(() => {
    setSaveState((current) =>
      current.status === "idle" ? current : { status: "idle" },
    );
  }, []);

  const updateCourse = useCallback(
    (patch: CourseFieldPatch) => {
      applyConfiguration({ ...configurationRef.current, ...patch });
      setFormErrors((current) => {
        const next = { ...current };
        for (const key of Object.keys(patch)) {
          delete next[key as keyof CourseFormErrors];
        }
        return next;
      });
      markUnsaved();
    },
    [applyConfiguration, markUnsaved],
  );

  const addDocument = useCallback(
    (document: KnowledgeDocument): AddDocumentResult => {
      const current = configurationRef.current;

      if (current.documents.length >= MAX_DOCUMENTS) {
        return {
          ok: false,
          error: documentError(
            "limit-reached",
            `You can keep up to ${MAX_DOCUMENTS} documents in this prototype. Remove one to add another.`,
          ),
        };
      }

      const duplicate = findDuplicate(current.documents, document);
      if (duplicate) {
        return {
          ok: false,
          error: documentError(
            "duplicate",
            `"${duplicate.title}" looks like the same document. It wasn't added again.`,
          ),
        };
      }

      const usedCharacters = totalCharacterCount(current.documents);
      const remaining = MAX_TOTAL_EXTRACTED_CHARACTERS - usedCharacters;
      if (document.characterCount > remaining) {
        return {
          ok: false,
          error: documentError(
            "total-limit-reached",
            `Adding this would exceed the ${MAX_TOTAL_EXTRACTED_CHARACTERS.toLocaleString(
              "en-US",
            )}-character total across all documents (a Moti AI prototype safeguard). About ${Math.max(
              0,
              remaining,
            ).toLocaleString("en-US")} characters remain — shorten it or remove a document.`,
          ),
        };
      }

      applyConfiguration({
        ...current,
        documents: [...current.documents, document],
      });
      markUnsaved();
      return { ok: true, document };
    },
    [applyConfiguration, markUnsaved],
  );

  const removeDocument = useCallback(
    (id: string) => {
      const current = configurationRef.current;
      applyConfiguration({
        ...current,
        documents: current.documents.filter((document) => document.id !== id),
      });
      markUnsaved();
    },
    [applyConfiguration, markUnsaved],
  );

  const resetSampleCourse = useCallback(() => {
    const fresh = createDefaultConfiguration();
    applyConfiguration(fresh);
    setFormErrors({});
    const result = persistConfiguration(fresh);
    if (result.ok) {
      setSavedSnapshot(serialize(fresh));
      setSaveState({ status: "saved", message: "Sample course restored." });
    } else {
      setSaveState({ status: "error", message: result.message });
    }
  }, [applyConfiguration]);

  const saveConfiguration = useCallback(() => {
    const errors = validateCourse(configurationRef.current);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      setSaveState({
        status: "error",
        message: "Fix the highlighted fields, then save again.",
      });
      return;
    }

    // localStorage writes are synchronous — persist immediately and report the
    // real outcome. No artificial delay, and nothing implies a server request.
    setFormErrors({});
    const result = persistConfiguration(configurationRef.current);
    if (result.ok) {
      setSavedSnapshot(serialize(configurationRef.current));
      setSaveState({ status: "saved", message: "Saved locally." });
    } else {
      setSaveState({ status: "error", message: result.message });
    }
  }, []);

  const value = useMemo<CourseConfigurationContextValue>(
    () => ({
      configuration,
      hydrated,
      isDirty: hydrated && serialize(configuration) !== savedSnapshot,
      saveState,
      formErrors,
      courseIsValid:
        configuration.courseTitle.trim().length > 0 &&
        configuration.learningObjective.trim().length > 0 &&
        configuration.assistantInstructions.trim().length > 0,
      documentLimitReached: configuration.documents.length >= MAX_DOCUMENTS,
      totalCharactersUsed: totalCharacterCount(configuration.documents),
      updateCourse,
      addDocument,
      removeDocument,
      resetSampleCourse,
      saveConfiguration,
    }),
    [
      configuration,
      hydrated,
      savedSnapshot,
      saveState,
      formErrors,
      updateCourse,
      addDocument,
      removeDocument,
      resetSampleCourse,
      saveConfiguration,
    ],
  );

  return (
    <CourseConfigurationContext.Provider value={value}>
      {children}
    </CourseConfigurationContext.Provider>
  );
}
