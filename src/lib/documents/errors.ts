// Typed, user-facing errors for document ingestion. Every message tells the
// learner what they can do next. Raw exceptions are never surfaced to the UI.

export type DocumentErrorCode =
  | "unsupported-type"
  | "too-large"
  | "empty-file"
  | "empty-content"
  | "no-pdf-text"
  | "malformed-pdf"
  | "too-long"
  | "total-limit-reached"
  | "missing-title"
  | "duplicate"
  | "limit-reached"
  | "read-failed";

export interface DocumentError {
  code: DocumentErrorCode;
  message: string;
}

export function documentError(
  code: DocumentErrorCode,
  message: string,
): DocumentError {
  return { code, message };
}

export function isDocumentError(value: unknown): value is DocumentError {
  return (
    typeof value === "object" &&
    value !== null &&
    "code" in value &&
    "message" in value
  );
}
