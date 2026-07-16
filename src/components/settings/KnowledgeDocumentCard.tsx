"use client";

import { useState } from "react";
import type { KnowledgeDocument, KnowledgeDocumentSource } from "@/lib/types";
import { IconEye, IconSource, IconTrash } from "@/components/ui/icons";
import { DOCUMENT_TYPE_LABEL } from "@/lib/documents/constants";
import {
  formatAddedDate,
  formatBytes,
  formatCharacterCount,
} from "@/lib/documents/format";

const SOURCE_LABEL: Record<KnowledgeDocumentSource, string> = {
  sample: "Sample",
  upload: "Uploaded",
  pasted: "Pasted",
};

interface KnowledgeDocumentCardProps {
  doc: KnowledgeDocument;
  onPreview: (doc: KnowledgeDocument) => void;
  onRemove: (id: string) => void;
}

export function KnowledgeDocumentCard({
  doc,
  onPreview,
  onRemove,
}: KnowledgeDocumentCardProps) {
  const [confirming, setConfirming] = useState(false);

  const metaParts = [
    DOCUMENT_TYPE_LABEL[doc.documentType],
    formatCharacterCount(doc.characterCount),
    doc.sizeBytes !== undefined ? formatBytes(doc.sizeBytes) : null,
    formatAddedDate(doc.addedAt),
  ].filter(Boolean);

  return (
    <li className="rounded-xl border border-moti-line bg-white p-3">
      <div className="flex items-start gap-2.5">
        <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-moti-navy/5 text-moti-navy-soft">
          <IconSource className="h-4 w-4" />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate text-sm font-medium text-moti-navy">
              {doc.title}
            </p>
            <span className="rounded-full bg-moti-navy/5 px-2 py-0.5 text-[11px] font-medium text-moti-navy-soft">
              {SOURCE_LABEL[doc.source]}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-moti-navy-soft">
            {metaParts.join(" · ")}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => onPreview(doc)}
            aria-label={`Preview ${doc.title}`}
            className="grid h-8 w-8 place-items-center rounded-md text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
          >
            <IconEye className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setConfirming(true)}
            aria-label={`Remove ${doc.title}`}
            className="grid h-8 w-8 place-items-center rounded-md text-moti-navy-soft transition-colors hover:bg-moti-danger-bg hover:text-moti-danger focus-visible:bg-moti-danger-bg"
          >
            <IconTrash className="h-4 w-4" />
          </button>
        </div>
      </div>

      {confirming && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-lg bg-moti-danger-bg px-3 py-2">
          <p className="mr-auto text-xs font-medium text-moti-danger">
            Remove this document?
          </p>
          <button
            type="button"
            onClick={() => setConfirming(false)}
            className="rounded-md border border-moti-line bg-white px-2.5 py-1 text-xs font-medium text-moti-navy-soft transition-colors hover:bg-moti-navy/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => onRemove(doc.id)}
            className="rounded-md bg-moti-danger px-2.5 py-1 text-xs font-medium text-white transition-colors hover:opacity-90"
          >
            Remove
          </button>
        </div>
      )}
    </li>
  );
}
