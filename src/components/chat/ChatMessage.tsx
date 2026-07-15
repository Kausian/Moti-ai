import type { ChatMessage, MotiResponseKind } from "@/lib/types";
import { MotiMirrorCard } from "./MotiMirrorCard";
import { SourceChip } from "./SourceChip";
import { IconArrowRight, IconSparkles } from "@/components/ui/icons";

const KIND_LABEL: Record<MotiResponseKind, string> = {
  answer: "Answer",
  "invite-explanation": "Invites you to explain",
  mirror: "Teach-back feedback",
};

export function ChatMessageItem({ message }: { message: ChatMessage }) {
  if (message.role === "learner") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-md bg-moti-navy px-4 py-2.5 text-sm leading-6 text-white shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <span
        aria-hidden
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-moti-pink via-moti-peach to-moti-yellow text-moti-navy"
      >
        <IconSparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div className="mb-1 flex flex-wrap items-center gap-2">
          <span className="text-sm font-semibold text-moti-navy">Moti</span>
          {message.kind && (
            <span className="rounded-full bg-moti-navy/5 px-2 py-0.5 text-[11px] font-medium text-moti-navy-soft">
              {KIND_LABEL[message.kind]}
            </span>
          )}
        </div>

        <div className="rounded-2xl rounded-tl-md border border-moti-line bg-white px-4 py-2.5 text-sm leading-6 text-moti-navy shadow-sm">
          {message.content}
        </div>

        {message.mirror && (
          <div className="mt-2">
            <MotiMirrorCard mirror={message.mirror} />
          </div>
        )}

        {message.sources && !message.mirror && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {message.sources.map((source) => (
              <SourceChip key={source.id} source={source} />
            ))}
          </div>
        )}

        {message.suggestedActions && message.suggestedActions.length > 0 && (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] font-medium uppercase tracking-wide text-moti-navy-soft">
              Suggested
            </span>
            {message.suggestedActions.map((action) => (
              <span
                key={action}
                className="inline-flex items-center gap-1 rounded-full border border-moti-line bg-white px-2.5 py-1 text-xs font-medium text-moti-navy-soft"
              >
                <IconArrowRight className="h-3 w-3" />
                {action}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
