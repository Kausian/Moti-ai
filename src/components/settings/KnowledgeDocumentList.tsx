"use client";

import { useRef } from "react";
import type { KnowledgeDocument } from "@/lib/types";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import {
  MAX_DOCUMENTS,
  MAX_TOTAL_EXTRACTED_CHARACTERS,
} from "@/lib/documents/constants";
import { KnowledgeDocumentCard } from "./KnowledgeDocumentCard";

interface KnowledgeDocumentListProps {
  onPreview: (doc: KnowledgeDocument) => void;
}

export function KnowledgeDocumentList({ onPreview }: KnowledgeDocumentListProps) {
  const { configuration, removeDocument, totalCharactersUsed } =
    useCourseConfiguration();
  const documents = configuration.documents;
  const headingRef = useRef<HTMLHeadingElement>(null);

  const handleRemove = (id: string) => {
    removeDocument(id);
    // Keep focus in a predictable place after the card unmounts.
    headingRef.current?.focus();
  };

  return (
    <section aria-labelledby="knowledge-documents-heading">
      <div className="mb-1.5 flex items-center justify-between gap-2">
        <h3
          id="knowledge-documents-heading"
          ref={headingRef}
          tabIndex={-1}
          className="text-sm font-medium text-moti-navy focus:outline-none"
        >
          Knowledge documents
        </h3>
        <span className="text-xs text-moti-navy-soft">
          {documents.length} / {MAX_DOCUMENTS}
        </span>
      </div>

      <p className="mb-2 text-xs text-moti-navy-soft">
        {totalCharactersUsed.toLocaleString("en-US")} /{" "}
        {MAX_TOTAL_EXTRACTED_CHARACTERS.toLocaleString("en-US")} characters used
        across all documents (a Moti AI prototype safeguard).
      </p>

      {documents.length > 0 ? (
        <ul className="flex flex-col gap-1.5">
          {documents.map((doc) => (
            <KnowledgeDocumentCard
              key={doc.id}
              doc={doc}
              onPreview={onPreview}
              onRemove={handleRemove}
            />
          ))}
        </ul>
      ) : (
        <p className="rounded-lg border border-dashed border-moti-line px-3 py-3 text-xs text-moti-navy-soft">
          No documents yet. Add material below, or reset to restore the sample
          course.
        </p>
      )}
    </section>
  );
}
