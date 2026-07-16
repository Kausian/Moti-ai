"use client";

import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from "react";
import { IconClose, IconSend } from "@/components/ui/icons";
import { MAX_MESSAGE_LENGTH } from "@/lib/chat/constants";

export interface MessageComposerHandle {
  clear: () => void;
  focus: () => void;
}

interface MessageComposerProps {
  onSend: (text: string) => void;
  onCancel: () => void;
  isPending: boolean;
}

// Controlled composer. It never clears itself — the panel calls `clear()` only
// when a send is actually accepted, so text is retained if a send is gated or
// fails before submission.
export const MessageComposer = forwardRef<MessageComposerHandle, MessageComposerProps>(
  function MessageComposer({ onSend, onCancel, isPending }, ref) {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useImperativeHandle(ref, () => ({
      clear: () => setValue(""),
      focus: () => textareaRef.current?.focus(),
    }));

    const canSend = value.trim().length > 0 && !isPending;

    const submit = () => {
      if (!canSend) return;
      onSend(value);
    };

    const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      submit();
    };

    const handleKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submit();
      }
    };

    return (
      <form
        aria-label="Message Moti"
        onSubmit={handleSubmit}
        className="rounded-2xl border border-moti-line bg-white p-2 shadow-sm transition-colors focus-within:border-moti-navy/40"
      >
        <label htmlFor="composer-input" className="sr-only">
          Message Moti
        </label>
        <textarea
          ref={textareaRef}
          id="composer-input"
          rows={2}
          value={value}
          maxLength={MAX_MESSAGE_LENGTH}
          onChange={(event) => setValue(event.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask Moti a question about your course material…"
          className="block w-full resize-none rounded-lg bg-transparent px-2 py-1.5 text-sm leading-6 text-moti-navy placeholder:text-moti-navy-soft/70 focus:outline-none"
        />
        <div className="mt-1 flex items-center justify-between gap-3 px-1">
          <span className="text-[11px] text-moti-navy-soft">
            {value.length}/{MAX_MESSAGE_LENGTH} · Enter to send, Shift+Enter for a
            new line
          </span>
          {isPending ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-1.5 rounded-full border border-moti-line px-4 py-1.5 text-sm font-medium text-moti-navy transition-colors hover:bg-moti-navy/5 focus-visible:bg-moti-navy/5"
            >
              <IconClose className="h-4 w-4" />
              Cancel
            </button>
          ) : (
            <button
              type="submit"
              disabled={!canSend}
              className="inline-flex items-center gap-1.5 rounded-full bg-moti-navy px-4 py-1.5 text-sm font-medium text-white transition-colors hover:bg-moti-navy/90 focus-visible:bg-moti-navy/90 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IconSend className="h-4 w-4" />
              Send
            </button>
          )}
        </div>
      </form>
    );
  },
);
