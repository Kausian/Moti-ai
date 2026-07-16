// Orchestrates turning a File or pasted text into a normalized, validated
// knowledge document. All processing happens locally; nothing is uploaded.

import type {
  KnowledgeDocument,
  KnowledgeDocumentSource,
  SupportedDocumentType,
} from "@/lib/types";
import { MAX_EXTRACTED_CHARACTERS } from "./constants";
import { documentError, isDocumentError, type DocumentError } from "./errors";
import { deriveTitleFromFileName, validateFile } from "./file-validation";
import { createDocumentId } from "./id";
import { isEffectivelyEmpty, normalizeExtractedText } from "./normalize-text";
import { extractPdfText } from "./parse-pdf";

/** A processed document before it is assigned an id / source / timestamp. */
export interface ProcessedDocument {
  title: string;
  originalFileName?: string;
  documentType: SupportedDocumentType;
  mimeType?: string;
  sizeBytes?: number;
  content: string;
  characterCount: number;
}

export type ProcessResult =
  | { ok: true; document: ProcessedDocument }
  | { ok: false; error: DocumentError };

const tooLongError = (): DocumentError =>
  documentError(
    "too-long",
    `That content is longer than the ${MAX_EXTRACTED_CHARACTERS.toLocaleString(
      "en-US",
    )} character limit for a single document. Split it into smaller documents.`,
  );

export async function processFile(file: File): Promise<ProcessResult> {
  const validation = validateFile(file);
  if (!validation.ok) return { ok: false, error: validation.error };

  const { documentType } = validation;
  let rawText: string;
  try {
    rawText =
      documentType === "pdf" ? await extractPdfText(file) : await file.text();
  } catch (caught) {
    if (isDocumentError(caught)) return { ok: false, error: caught };
    return {
      ok: false,
      error: documentError("read-failed", `Could not read "${file.name}". Please try again.`),
    };
  }

  const content = normalizeExtractedText(rawText);
  if (isEffectivelyEmpty(content)) {
    if (documentType === "pdf") {
      return {
        ok: false,
        error: documentError(
          "no-pdf-text",
          `No readable text was found in "${file.name}". Scanned or image-only PDFs can't be read here — this prototype has no OCR. Try a text-based PDF or paste the text instead.`,
        ),
      };
    }
    return {
      ok: false,
      error: documentError(
        "empty-content",
        `"${file.name}" has no readable text after processing.`,
      ),
    };
  }

  if (content.length > MAX_EXTRACTED_CHARACTERS) {
    return { ok: false, error: tooLongError() };
  }

  return {
    ok: true,
    document: {
      title: deriveTitleFromFileName(file.name),
      originalFileName: file.name,
      documentType,
      mimeType: file.type || undefined,
      sizeBytes: file.size,
      content,
      characterCount: content.length,
    },
  };
}

export function processPastedContent(input: {
  title: string;
  content: string;
}): ProcessResult {
  const title = input.title.trim();
  if (title.length === 0) {
    return {
      ok: false,
      error: documentError("missing-title", "Give this document a title before adding it."),
    };
  }

  const content = normalizeExtractedText(input.content);
  if (isEffectivelyEmpty(content)) {
    return {
      ok: false,
      error: documentError("empty-content", "Add some content before saving this document."),
    };
  }

  if (content.length > MAX_EXTRACTED_CHARACTERS) {
    return { ok: false, error: tooLongError() };
  }

  return {
    ok: true,
    document: {
      title,
      documentType: "plain-text",
      content,
      characterCount: content.length,
    },
  };
}

/** Assigns a stable id, source, and timestamp to a processed document. */
export function toKnowledgeDocument(
  processed: ProcessedDocument,
  source: KnowledgeDocumentSource,
): KnowledgeDocument {
  return {
    id: createDocumentId(),
    source,
    addedAt: new Date().toISOString(),
    ...processed,
  };
}
