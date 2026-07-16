import { IconSparkles } from "@/components/ui/icons";

// UI suggestions only — their answers are never hard-coded; selecting one simply
// fills a real question that goes through local retrieval + the AI.
const SUGGESTED_PROMPTS = [
  "What is an AI hallucination?",
  "How can I make a prompt clearer?",
  "What is prompt injection?",
];

interface SuggestedPromptsProps {
  onSelect: (prompt: string) => void;
  disabled: boolean;
}

export function SuggestedPrompts({ onSelect, disabled }: SuggestedPromptsProps) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-moti-pink via-moti-peach to-moti-yellow text-moti-navy">
        <IconSparkles className="h-6 w-6" />
      </span>
      <div>
        <p className="text-sm font-semibold text-moti-navy">Ask Moti about your material</p>
        <p className="mx-auto mt-1 max-w-sm text-xs leading-5 text-moti-navy-soft">
          Answers are grounded in your current course documents. If the material
          doesn&apos;t cover something, Moti will say so instead of guessing.
        </p>
      </div>
      <div className="flex flex-wrap justify-center gap-2">
        {SUGGESTED_PROMPTS.map((prompt) => (
          <button
            key={prompt}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(prompt)}
            className="rounded-full border border-moti-line bg-white px-3 py-1.5 text-xs font-medium text-moti-navy transition-colors hover:border-moti-navy/30 hover:bg-moti-navy/5 focus-visible:border-moti-navy/40 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {prompt}
          </button>
        ))}
      </div>
    </div>
  );
}
