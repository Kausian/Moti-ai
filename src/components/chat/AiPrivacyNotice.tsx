import { IconInfo } from "@/components/ui/icons";

// Transparent about the Phase 5 privacy-boundary change: from local-only to
// sending selected excerpts to an external AI provider. Phase 7 adds teach-back,
// which sends the concept and the learner's explanation (but no chat history).
export function AiPrivacyNotice() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-border-subtle bg-surface-muted/60 px-3 py-2 text-[11px] leading-5 text-text-secondary">
      <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        When you send a message, your question, recent conversation and up to four
        relevant source excerpts are sent to the configured Gemini API. When you
        teach a concept back, your explanation and that answer&apos;s source excerpts
        are sent instead — without your conversation history. Your full document
        collection is never sent. Documents stay in this browser and neither the
        conversation nor your teach-back feedback is saved by Moti AI.
      </p>
    </div>
  );
}
