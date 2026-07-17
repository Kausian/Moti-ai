"use client";

// App-level error boundary (Next.js App Router). Renders a calm, generic recovery
// screen when a client render throws — deliberately without exposing a stack
// trace or the raw error message, and without touching localStorage: a render
// error must never wipe the learner's saved course or progress.

import { useEffect } from "react";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface to the browser console for local debugging only; nothing is sent
    // anywhere and no learner data is included.
    if (process.env.NODE_ENV !== "production") {
      console.error("Moti AI encountered a render error:", error);
    }
  }, [error]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-moti-line bg-moti-surface p-6 text-center shadow-sm">
        <h1 className="text-lg font-semibold text-moti-navy">
          Something went wrong
        </h1>
        <p className="mt-2 text-sm text-moti-navy-soft">
          Moti hit an unexpected problem while rendering this view. Your saved
          course and learning progress are stored in this browser and have not
          been changed.
        </p>
        <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={reset}
            className="rounded-lg bg-moti-navy px-4 py-2 text-sm font-medium text-background transition-colors hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-moti-navy"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-lg border border-moti-line px-4 py-2 text-sm font-medium text-moti-navy transition-colors hover:bg-moti-navy/5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-moti-navy"
          >
            Reload page
          </button>
        </div>
      </div>
    </main>
  );
}
