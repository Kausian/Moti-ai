import { IconInfo } from "@/components/ui/icons";

// Transparent about the Phase 5 privacy-boundary change: from local-only to
// sending selected excerpts to an external AI provider.
export function AiPrivacyNotice() {
  return (
    <div className="flex items-start gap-2 rounded-lg border border-moti-line bg-moti-navy/[0.03] px-3 py-2 text-[11px] leading-4 text-moti-navy-soft">
      <IconInfo className="mt-0.5 h-3.5 w-3.5 shrink-0" />
      <p>
        When you send a message, your question, recent conversation and up to four
        relevant source excerpts are sent to the configured Gemini API. Your full
        document collection is not sent. Documents stay in this browser and the
        conversation is not saved by Moti AI.
      </p>
    </div>
  );
}
