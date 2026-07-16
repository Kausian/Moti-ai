"use client";

import { useState, type FormEvent } from "react";
import { useCourseConfiguration } from "@/hooks/useCourseConfiguration";
import {
  processPastedContent,
  toKnowledgeDocument,
} from "@/lib/documents/parse-document";
import type { DocumentError } from "@/lib/documents/errors";
import { MAX_EXTRACTED_CHARACTERS } from "@/lib/documents/constants";
import { Field, inputClass, inputInvalidClass } from "./formPrimitives";
import { IconCheckCircle, IconPlus } from "@/components/ui/icons";

export function PasteKnowledgeForm() {
  const { addDocument } = useCourseConfiguration();
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [error, setError] = useState<DocumentError | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const overLimit = content.length > MAX_EXTRACTED_CHARACTERS;
  const titleError = error?.code === "missing-title" ? error.message : undefined;
  const contentError =
    error?.code === "empty-content" || error?.code === "too-long"
      ? error.message
      : undefined;
  const generalError =
    error && !titleError && !contentError ? error.message : undefined;

  const clearFeedback = () => {
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setSuccess(null);

    const processed = processPastedContent({ title, content });
    if (!processed.ok) {
      setError(processed.error);
      setSubmitting(false);
      return;
    }

    const added = addDocument(toKnowledgeDocument(processed.document, "pasted"));
    if (!added.ok) {
      setError(added.error);
      setSubmitting(false);
      return;
    }

    setTitle("");
    setContent("");
    setError(null);
    setSuccess(`Added "${processed.document.title}".`);
    setSubmitting(false);
  };

  const canSubmit =
    title.trim().length > 0 && content.trim().length > 0 && !overLimit && !submitting;

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <p className="text-sm font-medium text-moti-navy">Paste learning content</p>

      <Field label="Document title" htmlFor="paste-title" required error={titleError}>
        <input
          id="paste-title"
          className={`${inputClass} ${titleError ? inputInvalidClass : ""}`}
          value={title}
          placeholder="e.g. Meeting notes on prompt safety"
          aria-invalid={titleError ? true : undefined}
          aria-describedby={titleError ? "paste-title-error" : undefined}
          onChange={(event) => {
            setTitle(event.target.value);
            clearFeedback();
          }}
        />
      </Field>

      <Field label="Content" htmlFor="paste-content" required error={contentError}>
        <textarea
          id="paste-content"
          rows={5}
          className={`${inputClass} resize-none ${contentError || overLimit ? inputInvalidClass : ""}`}
          value={content}
          placeholder="Paste notes, an article, or course text…"
          aria-invalid={contentError || overLimit ? true : undefined}
          aria-describedby={contentError ? "paste-content-error" : undefined}
          onChange={(event) => {
            setContent(event.target.value);
            clearFeedback();
          }}
        />
      </Field>

      <div className="flex items-center justify-between gap-3">
        <span
          className={`text-[11px] ${overLimit ? "font-medium text-moti-danger" : "text-moti-navy-soft"}`}
        >
          {content.length.toLocaleString("en-US")} /{" "}
          {MAX_EXTRACTED_CHARACTERS.toLocaleString("en-US")} characters
        </span>
        <button
          type="submit"
          disabled={!canSubmit}
          className="inline-flex items-center gap-1.5 rounded-lg bg-moti-navy px-3 py-2 text-sm font-medium text-white transition-colors hover:bg-moti-navy/90 focus-visible:bg-moti-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconPlus className="h-4 w-4" />
          Add document
        </button>
      </div>

      <div aria-live="polite">
        {generalError && (
          <p className="rounded-lg bg-moti-danger-bg px-3 py-2 text-xs font-medium text-moti-danger">
            {generalError}
          </p>
        )}
        {success && (
          <p className="flex items-center gap-1.5 rounded-lg bg-moti-understood-bg px-3 py-2 text-xs font-medium text-moti-understood">
            <IconCheckCircle className="h-4 w-4 shrink-0" />
            {success}
          </p>
        )}
      </div>
    </form>
  );
}
