"use client";

import { useMemo } from "react";
import type { KnowledgeIndex } from "@/lib/types";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import { buildIndex } from "@/lib/retrieval/build-index";

export type KnowledgeIndexStatus = "empty" | "ready" | "error";

export interface UseKnowledgeIndexResult {
  status: KnowledgeIndexStatus;
  index: KnowledgeIndex | null;
  error?: string;
}

// Derives the in-memory index from the active documents. `configuration.documents`
// keeps a stable reference across non-document edits (title, objective, etc.), so
// this only rebuilds when documents are added, removed, or reset. Indexing is
// synchronous; there is no artificial "building" delay.
export function useKnowledgeIndex(): UseKnowledgeIndexResult {
  const { configuration } = useCourseConfiguration();
  const documents = configuration.documents;

  return useMemo<UseKnowledgeIndexResult>(() => {
    if (documents.length === 0) {
      return { status: "empty", index: null };
    }
    try {
      const index = buildIndex(documents);
      if (index.chunks.length === 0) {
        return { status: "empty", index };
      }
      return { status: "ready", index };
    } catch {
      return {
        status: "error",
        index: null,
        error: "The knowledge index could not be built from the current documents.",
      };
    }
  }, [documents]);
}
