"use client";

import { useEffect, useRef } from "react";
import { IconClose } from "@/components/ui/icons";

/** Content shown by the shared plain-text preview dialog. */
export interface PreviewContent {
  title: string;
  subtitle?: string;
  note?: string;
  body: string;
}

interface PlainTextPreviewDialogProps {
  content: PreviewContent | null;
  onClose: () => void;
}

// A single accessible dialog used for both document and retrieved-chunk previews.
// Body text is rendered as plain text inside a <pre> (React escapes it) — no
// Markdown/HTML is interpreted and `dangerouslySetInnerHTML` is never used.
export function PlainTextPreviewDialog({
  content,
  onClose,
}: PlainTextPreviewDialogProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!content) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    closeButtonRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [content, onClose]);

  if (!content) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-moti-navy/40" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="plain-text-preview-title"
        className="relative flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl border border-moti-line bg-background shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-moti-line px-4 py-3">
          <div className="min-w-0">
            <h2
              id="plain-text-preview-title"
              className="truncate text-base font-semibold text-moti-navy"
            >
              {content.title}
            </h2>
            {content.subtitle && (
              <p className="text-xs text-moti-navy-soft">{content.subtitle}</p>
            )}
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Close preview"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
          >
            <IconClose className="h-5 w-5" />
          </button>
        </div>

        {content.note && (
          <p className="border-b border-moti-line bg-moti-navy/[0.03] px-4 py-2 text-xs text-moti-navy-soft">
            {content.note}
          </p>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <pre className="whitespace-pre-wrap break-words font-sans text-sm leading-6 text-moti-navy">
            {content.body}
          </pre>
        </div>
      </div>
    </div>
  );
}
