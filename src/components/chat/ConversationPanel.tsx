import type { ChatMessage, LearningAction } from "@/lib/types";
import { ChatMessageItem } from "./ChatMessage";
import { LearningActions } from "./LearningActions";
import { MessageComposer } from "./MessageComposer";

interface ConversationPanelProps {
  messages: ChatMessage[];
  actions: LearningAction[];
}

export function ConversationPanel({ messages, actions }: ConversationPanelProps) {
  return (
    <section
      aria-label="Learning conversation"
      className="flex h-full min-h-0 flex-col rounded-2xl border border-moti-line bg-moti-surface shadow-sm"
    >
      <div className="shrink-0 border-b border-moti-line px-4 py-2.5">
        <p className="text-sm font-semibold text-moti-navy">Learning conversation</p>
        <p className="text-xs text-moti-navy-soft">
          Think → Explain → Correct → Remember
        </p>
      </div>

      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {messages.map((message) => (
          <ChatMessageItem key={message.id} message={message} />
        ))}
      </div>

      <div className="shrink-0 space-y-2 border-t border-moti-line p-3">
        <LearningActions actions={actions} />
        <MessageComposer />
      </div>
    </section>
  );
}
