"use client";

import { useRef, useState, type DragEvent } from "react";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import { processFile, toKnowledgeDocument } from "@/lib/documents/parse-document";
import {
  FILE_INPUT_ACCEPT,
  MAX_DOCUMENTS,
  MAX_EXTRACTED_CHARACTERS,
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_EXTRACTED_CHARACTERS,
} from "@/lib/documents/constants";
import { formatBytes } from "@/lib/documents/format";
import { IconAlert, IconCheckCircle, IconUpload } from "@/components/ui/icons";

type FileResultStatus = "processing" | "added" | "error";

interface FileResult {
  id: string;
  name: string;
  status: FileResultStatus;
  message?: string;
}

export function KnowledgeUploader() {
  const { addDocument, documentLimitReached, totalCharactersUsed } =
    useCourseConfiguration();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [results, setResults] = useState<FileResult[]>([]);

  const totalExhausted = totalCharactersUsed >= MAX_TOTAL_EXTRACTED_CHARACTERS;
  const disabled = documentLimitReached || totalExhausted;

  const updateResult = (id: string, patch: Partial<FileResult>) =>
    setResults((current) =>
      current.map((result) =>
        result.id === id ? { ...result, ...patch } : result,
      ),
    );

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const files = Array.from(fileList);
    setProcessing(true);

    for (const file of files) {
      const resultId = `${file.name}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setResults((current) => [
        { id: resultId, name: file.name, status: "processing" },
        ...current,
      ]);

      const processed = await processFile(file);
      if (!processed.ok) {
        updateResult(resultId, { status: "error", message: processed.error.message });
        continue;
      }

      const added = addDocument(
        toKnowledgeDocument(processed.document, "upload"),
      );
      if (added.ok) {
        updateResult(resultId, {
          status: "added",
          message: `Added — ${processed.document.characterCount.toLocaleString(
            "en-US",
          )} characters extracted.`,
        });
      } else {
        updateResult(resultId, { status: "error", message: added.error.message });
      }
    }

    setProcessing(false);
    if (inputRef.current) inputRef.current.value = "";
  };

  const onDrop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragActive(false);
    if (disabled) return;
    void handleFiles(event.dataTransfer.files);
  };

  const onDragOver = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    if (!disabled) setDragActive(true);
  };

  return (
    <div>
      <p className="mb-1.5 text-sm font-medium text-moti-navy">Upload documents</p>

      <label
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={() => setDragActive(false)}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border border-dashed px-4 py-6 text-center transition-colors focus-within:border-moti-navy/50 focus-within:bg-moti-navy/[0.04] ${
          dragActive
            ? "border-moti-navy/50 bg-moti-navy/[0.05]"
            : "border-moti-line bg-moti-navy/[0.02]"
        } ${disabled ? "cursor-not-allowed opacity-60" : ""}`}
      >
        <span className="grid h-10 w-10 place-items-center rounded-full bg-moti-navy/5 text-moti-navy-soft">
          <IconUpload className="h-5 w-5" />
        </span>
        <span className="text-sm font-medium text-moti-navy">
          {processing
            ? "Processing…"
            : documentLimitReached
              ? "Document limit reached"
              : totalExhausted
                ? "Character limit reached"
                : "Drag and drop, or browse"}
        </span>
        <span
          id="uploader-limits"
          className="text-xs text-moti-navy-soft"
        >
          PDF, TXT, or Markdown · up to {MAX_DOCUMENTS} files ·{" "}
          {formatBytes(MAX_FILE_SIZE_BYTES)} each ·{" "}
          {MAX_EXTRACTED_CHARACTERS.toLocaleString("en-US")} characters per document ·{" "}
          {MAX_TOTAL_EXTRACTED_CHARACTERS.toLocaleString("en-US")} characters total.
        </span>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={FILE_INPUT_ACCEPT}
          aria-label="Upload PDF, TXT, or Markdown documents"
          aria-describedby="uploader-limits"
          disabled={disabled || processing}
          onChange={(event) => void handleFiles(event.target.files)}
          className="sr-only"
        />
        <span className="mt-1 rounded-lg border border-moti-line bg-white px-3 py-1.5 text-sm font-medium text-moti-navy">
          Browse files
        </span>
      </label>

      {results.length > 0 && (
        <ul aria-live="polite" className="mt-2 flex flex-col gap-1.5">
          {results.map((result) => (
            <li
              key={result.id}
              className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-xs ${
                result.status === "error"
                  ? "border-moti-danger/30 bg-moti-danger-bg"
                  : result.status === "added"
                    ? "border-moti-understood/30 bg-moti-understood-bg"
                    : "border-moti-line bg-white"
              }`}
            >
              <span className="mt-0.5 shrink-0">
                {result.status === "added" ? (
                  <IconCheckCircle className="h-4 w-4 text-moti-understood" />
                ) : result.status === "error" ? (
                  <IconAlert className="h-4 w-4 text-moti-danger" />
                ) : (
                  <span
                    aria-hidden
                    className="status-dot-pulse block h-3 w-3 rounded-full bg-moti-navy-soft"
                  />
                )}
              </span>
              <span className="min-w-0">
                <span className="block truncate font-medium text-moti-navy">
                  {result.name}
                </span>
                <span
                  className={
                    result.status === "error"
                      ? "text-moti-danger"
                      : "text-moti-navy-soft"
                  }
                >
                  {result.status === "processing"
                    ? "Processing in your browser…"
                    : result.message}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
