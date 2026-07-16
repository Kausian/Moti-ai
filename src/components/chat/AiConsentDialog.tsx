"use client";

import { useEffect, useRef } from "react";

interface AiConsentDialogProps {
  open: boolean;
  onCancel: () => void;
  onContinue: () => void;
}

// Shown once per browser session before the first real AI request (tracked in
// sessionStorage by the hook). Escape / Cancel abort; Continue proceeds.
export function AiConsentDialog({ open, onCancel, onContinue }: AiConsentDialogProps) {
  const continueRef = useRef<HTMLButtonElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    previouslyFocused.current = document.activeElement as HTMLElement | null;
    continueRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onCancel();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused.current?.focus();
    };
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-moti-navy/40" onClick={onCancel} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-consent-title"
        className="relative w-full max-w-md rounded-2xl border border-moti-line bg-background p-5 shadow-2xl"
      >
        <h2 id="ai-consent-title" className="text-base font-semibold text-moti-navy">
          Send this message to the AI service?
        </h2>
        <p className="mt-2 text-sm leading-6 text-moti-navy-soft">
          Moti now uses an external AI service to answer. When you continue, your
          question, recent conversation, and up to four relevant source excerpts
          are sent to the configured Gemini API.
        </p>
        <ul className="mt-2 flex list-disc flex-col gap-1 pl-5 text-xs leading-5 text-moti-navy-soft">
          <li>Your full document collection is never sent — only selected excerpts.</li>
          <li>Documents stay stored in this browser.</li>
          <li>The conversation is not saved by Moti AI.</li>
          <li>Provider-side handling follows the configured Gemini account and terms.</li>
        </ul>
        <div className="mt-4 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-moti-line px-3 py-2 text-sm font-medium text-moti-navy-soft transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
          >
            Cancel
          </button>
          <button
            ref={continueRef}
            type="button"
            onClick={onContinue}
            className="rounded-lg bg-moti-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-moti-navy/90 focus-visible:bg-moti-navy/90"
          >
            Continue and send
          </button>
        </div>
      </div>
    </div>
  );
}
