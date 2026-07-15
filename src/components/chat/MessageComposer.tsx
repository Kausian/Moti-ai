"use client";

import { useState } from "react";
import { IconSend } from "@/components/ui/icons";

const MAX_LENGTH = 500;

// The composer uses local state so the character count and send-button enabled
// state feel real. It does not submit anything in this phase.
export function MessageComposer() {
  const [value, setValue] = useState("");
  const canSend = value.trim().length > 0;

  return (
    <form
      aria-label="Message Moti"
      onSubmit={(event) => event.preventDefault()}
      className="rounded-2xl border border-moti-line bg-white p-2 shadow-sm transition-colors focus-within:border-moti-navy/40"
    >
      <label htmlFor="composer-input" className="sr-only">
        Message Moti
      </label>
      <textarea
        id="composer-input"
        rows={2}
        value={value}
        maxLength={MAX_LENGTH}
        onChange={(event) => setValue(event.target.value)}
        placeholder="Ask Moti about this concept, or explain it in your own words…"
        className="block w-full resize-none rounded-lg bg-transparent px-2 py-1.5 text-sm leading-6 text-moti-navy placeholder:text-moti-navy-soft/70 focus:outline-none"
      />
      <div className="mt-1 flex items-center justify-between gap-3 px-1">
        <span className="text-[11px] text-moti-navy-soft">
          {value.length}/{MAX_LENGTH} · Sending is disabled in this preview
        </span>
        <button
          type="submit"
          disabled={!canSend}
          className="inline-flex items-center gap-1.5 rounded-full bg-moti-navy px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-moti-navy/90 focus-visible:bg-moti-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <IconSend className="h-4 w-4" />
          Send
        </button>
      </div>
    </form>
  );
}
