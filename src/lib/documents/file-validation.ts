// Pure file identification and validation, independent of React.

import type { SupportedDocumentType } from "@/lib/types";
import { MAX_FILE_SIZE_BYTES } from "./constants";
import { documentError, type DocumentError } from "./errors";
import { formatBytes } from "./format";

export function getExtension(fileName: string): string {
  const dot = fileName.lastIndexOf(".");
  return dot === -1 ? "" : fileName.slice(dot).toLowerCase();
}

/** Resolves a document type from the file name and (optional) MIME type. */
export function identifyDocumentType(
  fileName: string,
  mimeType?: string,
): SupportedDocumentType | null {
  const extension = getExtension(fileName);
  if (extension === ".pdf" || mimeType === "application/pdf") return "pdf";
  if (extension === ".md" || extension === ".markdown") return "markdown";
  if (extension === ".txt") return "txt";
  return null;
}

/** Derives a readable document title from a file name (drops the extension). */
export function deriveTitleFromFileName(fileName: string): string {
  const withoutExtension = fileName.replace(/\.[^.]+$/, "").trim();
  return withoutExtension.length > 0 ? withoutExtension : fileName;
}

export interface FileValidationInput {
  name: string;
  type: string;
  size: number;
}

export type FileValidationResult =
  | { ok: true; documentType: SupportedDocumentType }
  | { ok: false; error: DocumentError };

export function validateFile(file: FileValidationInput): FileValidationResult {
  const documentType = identifyDocumentType(file.name, file.type);
  if (!documentType) {
    return {
      ok: false,
      error: documentError(
        "unsupported-type",
        `"${file.name}" isn't a supported format. Upload a PDF, TXT, or Markdown (.md) file.`,
      ),
    };
  }

  // PDFs reliably report their MIME type, so a contradicting non-empty type is
  // a strong signal the file was mislabelled. Text formats report MIME types
  // too inconsistently to enforce, so the extension governs there.
  if (documentType === "pdf" && file.type && file.type !== "application/pdf") {
    return {
      ok: false,
      error: documentError(
        "unsupported-type",
        `"${file.name}" doesn't look like a valid PDF. Upload a genuine PDF file.`,
      ),
    };
  }

  if (file.size === 0) {
    return {
      ok: false,
      error: documentError(
        "empty-file",
        `"${file.name}" is empty. Choose a file that contains text.`,
      ),
    };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: documentError(
        "too-large",
        `"${file.name}" is ${formatBytes(file.size)}, over the ${formatBytes(
          MAX_FILE_SIZE_BYTES,
        )} per-file limit for this prototype.`,
      ),
    };
  }

  return { ok: true, documentType };
}
